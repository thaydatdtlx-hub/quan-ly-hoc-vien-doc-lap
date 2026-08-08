import {defineConfig} from "vite";
import {resolve,basename} from "node:path";

const ORIGIN="https://hoclaixecungdat.vercel.app";
const SEO={
  "dang-ky-hoc-lai-xe.html":{
    title:"Học lái xe cùng Đạt",
    description:"Đăng ký học lái xe A1, A, B số tự động, B số sàn và C1 cùng Đạt. Học phí rõ ràng, học 600 câu online và theo dõi tiến độ tập trung.",
    path:"/dang-ky-hoc-lai-xe.html",
    image:"/hero-vip-navy-champagne.webp?v=1"
  },
  "600-cau-hoi.html":{
    title:"600 câu hỏi sát hạch lái xe | Học lái xe cùng Đạt",
    description:"Ôn tập 600 câu hỏi sát hạch lái xe, 60 câu điểm liệt và thi thử A1, A, B, C1 trên hệ thống Học lái xe cùng Đạt.",
    path:"/600-cau-hoi.html",
    image:"/hero-student-car.webp"
  },
  "bo-tuc-tay-lai.html":{
    title:"Bổ túc tay lái & sa hình | Học lái xe cùng Đạt",
    description:"Đăng ký bổ túc tay lái, sa hình và kỹ năng lái xe thực tế cùng Đạt với lịch học linh hoạt và chi phí rõ ràng.",
    path:"/bo-tuc-tay-lai.html",
    image:"/hero-vip-navy-champagne.webp?v=1"
  },
  "chinh-sach-bao-mat.html":{
    title:"Chính sách bảo mật | Học lái xe cùng Đạt",
    description:"Chính sách thu thập, sử dụng, bảo vệ và xử lý dữ liệu cá nhân trên hệ thống Học lái xe cùng Đạt.",
    path:"/chinh-sach-bao-mat.html",
    image:"/hero-vip-navy-champagne.webp?v=1"
  }
};

function setTag(html,pattern,replacement){return pattern.test(html)?html.replace(pattern,replacement):html}
function seoPlugin(){
  return{
    name:"thay-dat-static-seo",
    transformIndexHtml(html,ctx){
      const file=basename(ctx?.filename||"");
      const seo=SEO[file];
      if(!seo)return html;
      const canonical=`${ORIGIN}${seo.path}`;
      const image=new URL(seo.image,ORIGIN).href;
      html=setTag(html,/<title>[\s\S]*?<\/title>/i,`<title>${seo.title}</title>`);
      html=setTag(html,/<meta\s+name="description"\s+content="[^"]*"\s*\/?>/i,`<meta name="description" content="${seo.description}">`);
      html=setTag(html,/<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/i,`<meta property="og:title" content="${seo.title}">`);
      html=setTag(html,/<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/i,`<meta property="og:description" content="${seo.description}">`);
      html=setTag(html,/<meta\s+property="og:image"\s+content="[^"]*"\s*\/?>/i,`<meta property="og:image" content="${image}">`);
      html=setTag(html,/<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/i,`<link rel="canonical" href="${canonical}">`);
      const extras=[];
      if(!/property="og:url"/i.test(html))extras.push(`<meta property="og:url" content="${canonical}">`);
      if(!/name="twitter:card"/i.test(html))extras.push('<meta name="twitter:card" content="summary_large_image">');
      if(!/name="twitter:title"/i.test(html))extras.push(`<meta name="twitter:title" content="${seo.title}">`);
      if(!/name="twitter:description"/i.test(html))extras.push(`<meta name="twitter:description" content="${seo.description}">`);
      if(!/name="twitter:image"/i.test(html))extras.push(`<meta name="twitter:image" content="${image}">`);
      if(file==="dang-ky-hoc-lai-xe.html"&&!/application\/ld\+json/i.test(html)){
        extras.push(`<script type="application/ld+json">${JSON.stringify({"@context":"https://schema.org","@type":"Organization","name":"Học lái xe cùng Đạt","url":canonical,"logo":`${ORIGIN}/app-icon-512.png`,"telephone":"0984811037","sameAs":["https://www.facebook.com/profile.php?id=61579863779611","https://www.tiktok.com/@datdidaydo99"]})}</script>`);
      }
      return extras.length?html.replace("</head>",`  ${extras.join("\n  ")}\n</head>`):html;
    }
  };
}

export default defineConfig({
  plugins:[seoPlugin()],
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
