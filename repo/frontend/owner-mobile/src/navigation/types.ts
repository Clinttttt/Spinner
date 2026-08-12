import type { SettingsPageId } from "../features/settings/models/settings";

export type RootTabParamList = {
  Home: undefined;
  ManualOrders: undefined;
  Orders: undefined;
  /**
   * The shop's order ledger. An order code opens that order with its details
   * showing, which is how a sale in Transaction History is followed through.
   */
  OrderHistory: { orderCode?: string } | undefined;
  Schedule: undefined;
  TransactionHistory: undefined;
  Reports: undefined;
  /**
   * The shop's settings. A page id opens that page directly, which is how "Contact
   * support" on an order reaches the Help Center from another tab.
   */
  Settings: { page?: SettingsPageId } | undefined;
};
