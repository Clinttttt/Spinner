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
  Settings: undefined;
};
