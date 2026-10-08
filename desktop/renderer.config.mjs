import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=path.dirname(fileURLToPath(import.meta.url));
export default defineConfig({root,base:'./',plugins:[react()],resolve:{alias:{'@':path.resolve(root,'..')}},build:{outDir:path.join(root,'out/renderer'),emptyOutDir:true},css:{postcss:path.resolve(root,'..')}});
