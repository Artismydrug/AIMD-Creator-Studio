import AsyncStorage from '@react-native-async-storage/async-storage';
import { createMiniHabitSketchbook } from './miniHabitSketchbook';

export const miniHabitSketchbook = createMiniHabitSketchbook(AsyncStorage);
