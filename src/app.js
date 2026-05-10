import '../style.css';
import { mount } from './ui/mount.svelte.js';

const root = document.getElementById('app');
if (root) {
  mount(root);
}
