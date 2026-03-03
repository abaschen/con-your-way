import './style.css';
import { GameUI } from './ui/GameUI.js';

// Boot the game when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new GameUI();
});
