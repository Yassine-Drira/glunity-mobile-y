import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
// @ts-ignore
import type { AppStackParamList } from '../../auth/navigation/types';
import CaptureScreen from './CaptureScreen';
import EditScreen from './EditScreen';
import ShareScreen from './ShareScreen';
import AddCoverScreen from './AddCoverScreen';
// @ts-ignore
import { ReelCreationProvider } from '../context/ReelCreationContext';

const ReelStack = createNativeStackNavigator<AppStackParamList>();

export function ReelCreationNavigator() {
	return (
		<ReelCreationProvider>
			<ReelStack.Navigator
				screenOptions={{ headerShown: false }}
			>
				<ReelStack.Screen
					name="ReelCapture"
					component={CaptureScreen}
					options={{ animation: 'slide_from_bottom' }}
				/>
				<ReelStack.Screen
					name="ReelEdit"
					component={EditScreen}
					options={{ animation: 'slide_from_right' }}
				/>
				<ReelStack.Screen
					name="ReelShare"
					component={ShareScreen}
					options={{ animation: 'slide_from_right' }}
				/>
				<ReelStack.Screen
					name="ReelAddCover"
					component={AddCoverScreen}
					options={{ animation: 'slide_from_right' }}
				/>
			</ReelStack.Navigator>
		</ReelCreationProvider>
	);
}
