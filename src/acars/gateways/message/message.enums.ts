export enum AuthorityCategory {
  Station = 4,
  CPDLC = 5,
  Telex = 6,
  Administrative = 7,
}

export enum AuthorityAction {
  AddStation = 30,
  RemoveStation = 31,
  UpdateStationStatus = 32,

  SendCPDLCMessage = 40,
  ReceiveCPDLCMessage = 41,
  CPDLCAcknowledgement = 42,
  CPDLCError = 43,

  SendTelexMessage = 50,
  ReceiveTelexMessage = 51,
  TelexAcknowledgement = 52,
  TelexError = 53,

  Broadcast = 60,
  ServerAnnouncement = 62,
}

export enum ResponseCode {
  None = 'N',
  WilcoUnable = 'WU',
  Roger = 'R',
  Affirmative = 'Y',
}
