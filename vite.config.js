import {defineConfig} from "vite";
import {resolve} from "node:path";

export default defineConfig({
  build:{
    rollupOptions:{
      input:{
        main:resolve(__dirname,"index.html"),
        login:resolve(__dirname,"dang-nhap.html"),
        schedule:resolve(__dirname,"lich-dao-tao.html"),
        student:resolve(__dirname,"hoc-vien.html"),
        theory:resolve(__dirname,"600-cau-hoi.html"),
        drivingRefresh:resolve(__dirname,"bo-tuc-tay-lai.html"),
        newStudentRegistration:resolve(__dirname,"dang-ky-hoc-lai-xe.html"),
        privacyPolicy:resolve(__dirname,"chinh-sach-bao-mat.html"),
        notFound:resolve(__dirname,"404.html")
      }
    }
  }
});
