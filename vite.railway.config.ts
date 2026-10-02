import {defineConfig} from 'vite';
import vinext from 'vinext';
import {fileURLToPath} from 'node:url';
export default defineConfig({
 plugins:[vinext()],
 resolve:{alias:{'cloudflare:workers':fileURLToPath(new URL('./build/railway-env.ts',import.meta.url))}}
});
