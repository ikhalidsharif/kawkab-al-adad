import './styles.css';
import { initFx } from './core/fx';
import { h } from './core/dom';
import { route, startRouter } from './router';
import { mountHud } from './ui/hud';
import { startScreen } from './ui/screens/start';
import { mapScreen } from './ui/screens/map';
import { stationScreen } from './ui/screens/station';
import { learnScreen } from './ui/screens/learn';
import { practiceScreen } from './ui/screens/practice';
import { blitzScreen } from './ui/screens/blitz';
import { bossScreen } from './ui/screens/boss';
import { fortressGame } from './ui/games/fortress';
import { achievementsScreen } from './ui/screens/achievements';
import { notebookScreen } from './ui/screens/notebook';
import { parentScreen } from './ui/screens/parent';
import { examScreen } from './ui/screens/exam';
import { weakScreen } from './ui/screens/weak';

initFx(document.getElementById('fx') as HTMLCanvasElement);

const app = document.getElementById('app')!;
const hud = h('header', { class: 'sticky top-0 z-40 border-b border-space-700/70 bg-space-950/85 backdrop-blur' });
const view = h('main', { class: 'max-w-6xl mx-auto px-4 py-6' });
app.append(hud, view);
mountHud(hud);

route(/^\/start$/, startScreen);
route(/^\/map$/, mapScreen);
route(/^\/station\/([\w-]+)$/, stationScreen);
route(/^\/station\/([\w-]+)\/learn$/, learnScreen);
route(/^\/station\/([\w-]+)\/practice$/, practiceScreen);
route(/^\/station\/([\w-]+)\/blitz$/, blitzScreen);
route(/^\/station\/2-2a\/fortress$/, fortressGame);
route(/^\/boss\/(\d)$/, bossScreen);
route(/^\/achievements$/, achievementsScreen);
route(/^\/notebook$/, notebookScreen);
route(/^\/parent$/, parentScreen);
route(/^\/exam$/, examScreen);
route(/^\/weak\/([\w,-]+)$/, weakScreen);

startRouter(view);
