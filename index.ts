import { registerRootComponent } from 'expo';

import App from './App';
import { registerAlarmEvents } from './src/calendar/alarm';

// Doit être appelé ici, avant tout rendu : une alarme touchée appli fermée est traitée sans ouvrir d'écran.
registerAlarmEvents();

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
