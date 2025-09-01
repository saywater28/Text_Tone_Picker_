import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
base: '/Text_Tone_Picker_/',
plugins: [react()],
server: {
  proxy: {
    '/api': 'http://localhost:8080'
  }
}
});