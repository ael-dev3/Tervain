import './style.css';
import { App } from './app';

const canvas = document.getElementById('view') as HTMLCanvasElement;
const ui = document.getElementById('ui') as HTMLElement;
const app = new App(canvas, ui);
app.init().catch((e) => {
  console.error(e);
  ui.textContent = 'Tervain could not start: ' + (e instanceof Error ? e.message : String(e));
});
