use spacetimedb::{table, reducer, Table, ReducerContext, Identity, Timestamp, SpacetimeType};

#[derive(SpacetimeType, PartialEq, Clone)]
pub enum MessageDirection {
    Internal,
    OutboundToHoppie,
    InboundFromHoppie,
}

#[derive(SpacetimeType, Copy, Clone, PartialEq)]
pub enum MessageStatus {
    Pending,
    Delivered,
    Failed,
}

#[table(name = station, public)]
pub struct Station {
    #[primary_key]
    pub client_id: Identity,
    #[unique]
    pub station_code: String,
    pub login_time: Timestamp,
    pub is_online: bool,
}

#[table(name = message, public)]
pub struct Message {
    #[primary_key]
    #[auto_inc]
    pub id: u64,
    pub sender_code: String,
    pub receiver_code: String,
    pub payload: String,
    pub timestamp: Timestamp,
    pub direction: MessageDirection,
    pub status: MessageStatus,
}

#[table(name = statistics, public)]
pub struct Statistics {
    #[primary_key]
    pub id: u32,
    pub total_messages_sent: u64,
    pub total_hoppie_relays: u64,
    pub active_stations_count: u32,
}

#[reducer(init)]
pub fn init(ctx: &ReducerContext) {
    if ctx.db.statistics().id().find(&0).is_none() {
        ctx.db.statistics().insert(Statistics {
            id: 0,
            total_messages_sent: 0,
            total_hoppie_relays: 0,
            active_stations_count: 0,
        });
    }
}

#[reducer]
pub fn login(ctx: &ReducerContext, station_code: String) -> Result<(), String> {
    let station_code = station_code.to_uppercase();
    
    if let Some(existing) = ctx.db.station().station_code().find(&station_code) {
        if existing.is_online && existing.client_id != ctx.sender {
            return Err(format!("Station {} is already active", station_code));
        }
    }

    if let Some(station) = ctx.db.station().client_id().find(&ctx.sender) {
        ctx.db.station().client_id().update(Station {
            station_code: station_code.clone(),
            login_time: ctx.timestamp,
            is_online: true,
            ..station
        });
    } else {
        ctx.db.station().insert(Station {
            client_id: ctx.sender,
            station_code: station_code.clone(),
            login_time: ctx.timestamp,
            is_online: true,
        });
    }

    update_stats(ctx, |s| s.active_stations_count += 1);
    
    spacetimedb::log::info!("Station logged in: {}", station_code);
    Ok(())
}

#[reducer(client_disconnected)]
pub fn on_disconnect(ctx: &ReducerContext) {
    if let Some(station) = ctx.db.station().client_id().find(&ctx.sender) {
        if station.is_online {
            ctx.db.station().client_id().update(Station {
                is_online: false,
                ..station
            });
            update_stats(ctx, |s| s.active_stations_count = s.active_stations_count.saturating_sub(1));
        }
    }
}

#[reducer]
pub fn send_message(
    ctx: &ReducerContext, 
    receiver_code: String, 
    payload: String, 
    route_to_hoppie: bool
) -> Result<(), String> {
    let sender = ctx.db.station().client_id().find(&ctx.sender)
        .ok_or("Not logged in")?;

    let direction = if route_to_hoppie {
        MessageDirection::OutboundToHoppie
    } else {
        MessageDirection::Internal
    };

    ctx.db.message().insert(Message {
        id: 0, 
        sender_code: sender.station_code,
        receiver_code: receiver_code.to_uppercase(),
        payload,
        timestamp: ctx.timestamp,
        direction,
        status: MessageStatus::Pending,
    });

    update_stats(ctx, |s| {
        s.total_messages_sent += 1;
        if route_to_hoppie { s.total_hoppie_relays += 1; }
    });

    Ok(())
}

#[reducer]
pub fn receive_hoppie_message(
    ctx: &ReducerContext, 
    sender_code: String, 
    receiver_code: String, 
    payload: String
) -> Result<(), String> {
    ctx.db.message().insert(Message {
        id: 0,
        sender_code: sender_code.to_uppercase(),
        receiver_code: receiver_code.to_uppercase(),
        payload,
        timestamp: ctx.timestamp,
        direction: MessageDirection::InboundFromHoppie,
        status: MessageStatus::Delivered,
    });
    Ok(())
}

#[reducer]
pub fn update_message_status(ctx: &ReducerContext, message_id: u64, new_status: MessageStatus) -> Result<(), String> {
    if let Some(msg) = ctx.db.message().id().find(&message_id) {
        ctx.db.message().id().update(Message {
            status: new_status,
            ..msg
        });
        return Ok(());
    }
    Err("Message not found".into())
}

#[reducer]
pub fn cleanup_old_messages(ctx: &ReducerContext) {
    let cutoff_micros = (ctx.timestamp.to_micros_since_unix_epoch() as u64).saturating_sub(3_600_000_000);
    let cutoff = Timestamp::from_micros_since_unix_epoch(cutoff_micros as i64);

    let to_delete: Vec<u64> = ctx.db.message().iter()
        .filter(|m| m.timestamp < cutoff)
        .map(|m| m.id)
        .collect();

    for id in to_delete {
        ctx.db.message().id().delete(&id);
    }
}

fn update_stats<F>(ctx: &ReducerContext, mut f: F) 
where F: FnMut(&mut Statistics) 
{
    if let Some(mut stats) = ctx.db.statistics().id().find(&0) {
        f(&mut stats);
        ctx.db.statistics().id().update(stats);
    }
}