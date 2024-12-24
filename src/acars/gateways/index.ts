export * from './authentication/authentication.gateway';
export * from './identity/identity.gateway';
export * from './message/message.gateway';

export * from './authentication/authentication.service';
export * from './identity/identity.service';
export * from './message/message.service';

import * as AuthenticationEnums from './authentication/authentication.enums';
import * as StationEnums from './identity/identity.enums';
import * as MessageEnums from './message/message.enums';

export const Enum = {
  ...AuthenticationEnums,
  ...StationEnums,
  ...MessageEnums,
};
