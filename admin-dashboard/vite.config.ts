import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import {fileURLToPath} from 'node:url';
export default defineConfig({
optimizeDeps:{include:['three','three/addons/environments/RoomEnvironment.js','three/addons/geometries/RoundedBoxGeometry.js']},plugins:[react(),tailwindcss()],publicDir:'../public',build:{rolldownOptions:{input:{admin:fileURLToPath(new URL('./index.html',import.meta.url)),preview:fileURLToPath(new URL('./preview/index.html',import.meta.url))}}},server:{proxy:{'/api':{target:'http://127.0.0.1:8787',changeOrigin:false}}},preview:{proxy:{'/api':{target:'http://127.0.0.1:8787',changeOrigin:false}}}});
