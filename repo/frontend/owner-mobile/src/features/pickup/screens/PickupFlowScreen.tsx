import { createNativeStackNavigator } from "@react-navigation/native-stack";

import type { PickupStackParamList } from "../navigation/types";
import { PickupLocationScreen } from "./PickupLocationScreen";
import { PickupScreen } from "./PickupScreen";

const Stack = createNativeStackNavigator<PickupStackParamList>();

export function PickupFlowScreen() {
  return (
    <Stack.Navigator
      screenOptions={{ animation: "slide_from_right", headerShown: false }}
    >
      <Stack.Screen component={PickupScreen} name="PickupList" />
      <Stack.Screen component={PickupLocationScreen} name="PickupLocation" />
    </Stack.Navigator>
  );
}
