export * from './authentication/authentication.gateway';
export * from './station/station.gateway';
export * from './message/message.gateway';

export * from './authentication/authentication.service';
export * from './station/station.service';
export * from './message/message.service';

import * as AuthenticationEnums from './authentication/authentication.enums';
import * as StationEnums from './station/station.enums';
import * as MessageEnums from './message/message.enums';

export const Enum = {
  ...AuthenticationEnums,
  ...StationEnums,
  ...MessageEnums,
};
