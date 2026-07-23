import {defineConfig} from "vite";
import {resolve} from "node:path";

export default defineConfig({
  build:{
    rollupOptions:{
      input:{
        main:resolve(__dirname,"index.html"),
        schedule:resolve(__dirname,"lich-dao-tao.html"),
        student:resolve(__dirname,"hoc-vien.html")
      }
    }
  }
});
