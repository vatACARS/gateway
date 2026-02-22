use spacetimedb::{spacetimedb, Identity, ReducerContext, Timestamp};

#[spacetimedb(table)]
pub struct Station {
    #[primarykey]
    pub client_id: Identity,
    #[unique]
    pub station_code: String, // e.g., "YMML", "YSSY"
    pub login_time: Timestamp,
    pub is_online: bool,
}

#[derive(spacetimedb::SpacetimeType, PartialEq)]
pub enum MessageDirection {
    Internal,
    OutboundToHoppie,
    InboundFromHoppie,
}

#[derive(spacetimedb::SpacetimeType, Copy, Clone, PartialEq)]
pub enum MessageStatus {
    Pending,
    Delivered,
    Failed,
}

#[spacetimedb(table)]
pub struct Message {
    #[primarykey]
    #[autoinc]
    pub id: u64,
    pub sender_code: String,
    pub receiver_code: String,
    pub payload: String,
    pub timestamp: Timestamp,
    pub direction: MessageDirection,
    pub status: MessageStatus,
}

#[spacetimedb(table)]
pub struct Statistics {
    #[primarykey]
    pub id: u32, // Always 0 for singleton pattern
    pub total_messages_sent: u64,
    pub total_hoppie_relays: u64,
    pub active_stations_count: u32,
}

// --- Reducers ---

/// Initializes the statistics singleton if it doesn't exist.
#[spacetimedb(init)]
pub fn init(_ctx: ReducerContext) {
    Statistics::insert(Statistics {
        id: 0,
        total_messages_sent: 0,
        total_hoppie_relays: 0,
        active_stations_count: 0,
    }).expect("Failed to initialize statistics");
    
    // Note: Scheduling the cleanup reducer is typically done via 
    // the CLI or an external timer calling the reducer in v0.12.
}

/// Logs a vatSys client into a specific station code (e.g., YMML).
/// Prevents multiple identities from claiming the same station code.
#[spacetimedb(reducer)]
pub fn login(ctx: ReducerContext, station_code: String) -> Result<(), String> {
    let station_code = station_code.to_uppercase();
    
    // Check if station code is already taken by someone else online
    if let Some(existing) = Station::filter_by_station_code(&station_code) {
        if existing.is_online && existing.client_id != ctx.sender {
            return Err(format!("Station {} is already active", station_code));
        }
    }

    let station = Station {
        client_id: ctx.sender,
        station_code,
        login_time: ctx.timestamp,
        is_online: true,
    };

    Station::upsert(station);
    update_stats(|s| s.active_stations_count += 1);
    
    Ok(())
}

/// Marks the calling identity as offline.
#[spacetimedb(reducer)]
pub fn logout(ctx: ReducerContext) -> Result<(), String> {
    if let Some(mut station) = Station::filter_by_client_id(&ctx.sender) {
        if station.is_online {
            station.is_online = false;
            Station::update_by_client_id(&ctx.sender, station);
            update_stats(|s| s.active_stations_count = s.active_stations_count.saturating_sub(1));
        }
        return Ok(());
    }
    Err("Not logged in".into())
}

/// Disconnect hook: Automatically logs out the station if the vatSys client closes.
#[spacetimedb(disconnect)]
pub fn client_disconnected(ctx: ReducerContext) {
    let _ = logout(ctx);
}

/// Sends an ACARS message. 
/// If `route_to_hoppie` is true, the sidecar will pick it up and relay to the real world.
#[spacetimedb(reducer)]
pub fn send_message(
    ctx: ReducerContext, 
    receiver_code: String, 
    payload: String, 
    route_to_hoppie: bool
) -> Result<(), String> {
    let sender = Station::filter_by_client_id(&ctx.sender)
        .ok_or("You must be logged in to send messages")?;

    let direction = if route_to_hoppie {
        MessageDirection::OutboundToHoppie
    } else {
        MessageDirection::Internal
    };

    Message::insert(Message {
        id: 0, // Auto-incremented
        sender_code: sender.station_code,
        receiver_code: receiver_code.to_uppercase(),
        payload,
        timestamp: ctx.timestamp,
        direction,
        status: MessageStatus::Pending,
    })?;

    update_stats(|s| {
        s.total_messages_sent += 1;
        if route_to_hoppie { s.total_hoppie_relays += 1; }
    });

    Ok(())
}

/// Invoked by the Hoppie Relay Sidecar to push messages from the external network into SpacetimeDB.
#[spacetimedb(reducer)]
pub fn receive_hoppie_message(
    _ctx: ReducerContext, 
    sender_code: String, 
    receiver_code: String, 
    payload: String
) -> Result<(), String> {
    Message::insert(Message {
        id: 0,
        sender_code: sender_code.to_uppercase(),
        receiver_code: receiver_code.to_uppercase(),
        payload,
        timestamp: _ctx.timestamp,
        direction: MessageDirection::InboundFromHoppie,
        status: MessageStatus::Delivered,
    })?;
    
    Ok(())
}

/// Updates message status (e.g., from Pending to Delivered/Failed).
#[spacetimedb(reducer)]
pub fn update_message_status(_ctx: ReducerContext, message_id: u64, new_status: MessageStatus) -> Result<(), String> {
    if let Some(mut msg) = Message::filter_by_id(&message_id) {
        msg.status = new_status;
        Message::update_by_id(&message_id, msg);
        return Ok(());
    }
    Err("Message not found".into())
}

/// Deletes messages older than 1 hour (3,600,000,000 microseconds).
#[spacetimedb(reducer)]
pub fn cleanup_old_messages(ctx: ReducerContext) {
    let one_hour_ago = ctx.timestamp.duration_since(Timestamp::UNIX_EPOCH)
        .as_micros()
        .saturating_sub(3_600_000_000);
    let cutoff = Timestamp::from_unix_epoch(one_hour_ago);

    for msg in Message::iter() {
        if msg.timestamp < cutoff {
            Message::delete_by_id(&msg.id);
        }
    }
}

// --- Internal Helpers ---

fn update_stats<F>(mut f: F) 
where F: FnMut(&mut Statistics) 
{
    if let Some(mut stats) = Statistics::filter_by_id(&0) {
        f(&mut stats);
        Statistics::update_by_id(&0, stats);
    }
}