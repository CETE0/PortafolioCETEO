(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[503],{3115:function(e,t,l){Promise.resolve().then(l.bind(l,6256))},6256:function(e,t,l){"use strict";l.r(t),l.d(t,{default:function(){return m}});var a=l(7437),s=l(2265),i=l(6691),r=l.n(i),c=l(1393),n=l(2186);function o(e){let{videoId:t,title:l}=e,[i,r]=(0,s.useState)(!0);return(0,a.jsx)("div",{className:"flex items-center justify-center h-full w-full",children:(0,a.jsxs)("div",{className:"relative w-full max-w-4xl mx-auto h-0 pb-[56.25%]",children:[i&&(0,a.jsx)("div",{className:"absolute inset-0 flex items-center justify-center",children:(0,a.jsx)("div",{className:"w-8 h-8 border-2 border-gray-600 border-t-transparent rounded-full animate-spin"})}),(0,a.jsx)("iframe",{src:"https://www.youtube.com/embed/".concat(t,"?autoplay=0&rel=0&modestbranding=1"),title:l||"YouTube Video",allow:"accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture",allowFullScreen:!0,className:"absolute top-0 left-0 w-full h-full",onLoad:()=>r(!1)})]})})}var d=l(3473);function x(e){var t;let{content:l}=e;return l?(0,a.jsxs)(n.E.article,{initial:{opacity:0},animate:{opacity:1},className:"max-w-3xl mx-auto px-8 py-12 text-black",children:[(0,a.jsxs)("header",{className:"mb-12",children:[(0,a.jsx)("h1",{className:"text-2xl font-light mb-2 text-black",children:l.title}),l.date&&(0,a.jsx)("p",{className:"text-sm text-black/70",children:l.date})]}),(0,a.jsx)("div",{className:"prose prose-sm max-w-none text-black",children:(0,a.jsx)(d.U,{components:{p:e=>{let{node:t,...l}=e;return(0,a.jsx)("p",{className:"text-black",...l})},h1:e=>{let{node:t,...l}=e;return(0,a.jsx)("h1",{className:"text-black",...l})},h2:e=>{let{node:t,...l}=e;return(0,a.jsx)("h2",{className:"text-black",...l})},h3:e=>{let{node:t,...l}=e;return(0,a.jsx)("h3",{className:"text-black",...l})},li:e=>{let{node:t,...l}=e;return(0,a.jsx)("li",{className:"text-black",...l})},a:e=>{let{node:t,...l}=e;return(0,a.jsx)("a",{className:"text-black underline",...l})}},children:l.body})}),null===(t=l.images)||void 0===t?void 0:t.map((e,t)=>(0,a.jsxs)("figure",{className:"my-8",children:[(0,a.jsx)("div",{className:"relative w-full h-auto",children:(0,a.jsx)(r(),{src:e.src,alt:e.alt,width:800,height:500,className:"w-full h-auto"})}),e.caption&&(0,a.jsx)("figcaption",{className:"mt-2 text-sm text-black/70 text-center",children:e.caption})]},t))]}):null}function u(e){let{modelId:t}=e;return(0,a.jsx)("div",{className:"w-full h-full",children:(0,a.jsx)("iframe",{title:"Sketchfab Viewer",src:"https://sketchfab.com/models/".concat(t,"/embed"),className:"w-full h-full",allow:"autoplay; fullscreen; xr-spatial-tracking",frameBorder:"0"})})}let h=e=>"/PortafolioCETEO".concat(e);function m(e){let{content:t=[],title:l}=e,[i,d]=(0,s.useState)(0),[m,f]=(0,s.useState)(0);if(!t||0===t.length)return(0,a.jsx)("div",{className:"h-full flex items-center justify-center text-black",children:"No content available"});let b=t[i];return(0,s.useEffect)(()=>{let e=e=>{"ArrowRight"===e.key&&i<t.length-1&&(f(1),d(i+1)),"ArrowLeft"===e.key&&i>0&&(f(-1),d(i-1))};return window.addEventListener("keydown",e),()=>window.removeEventListener("keydown",e)},[i,t.length]),(0,a.jsxs)("div",{className:"flex flex-col h-full bg-white",children:[(0,a.jsx)("div",{className:"flex-1 relative overflow-hidden",children:(0,a.jsx)(c.M,{mode:"wait",initial:!1,custom:m,children:(0,a.jsx)(n.E.div,{className:"absolute w-full h-full",initial:{opacity:0,x:50*m},animate:{opacity:1,x:0},exit:{opacity:0,x:-(50*m)},transition:{duration:.3},children:(()=>{if(!b)return null;switch(b.type){case"image":return(0,a.jsx)("div",{className:"relative w-full h-full flex items-center justify-center bg-white",children:(0,a.jsx)("div",{className:"relative",children:(0,a.jsx)(r(),{src:h(b.src),alt:b.alt||"",width:6240,height:4160,className:"w-auto h-auto object-contain",style:{maxHeight:"calc(100vh - 120px)"},priority:0===i})})});case"youtube":return(0,a.jsx)(o,{videoId:b.id,title:b.title});case"text":return(0,a.jsx)(x,{content:b});case"3d":return(0,a.jsx)(u,{modelId:b.modelId,title:b.title});default:return null}})()},i)})}),(0,a.jsxs)("div",{className:"bg-white border-t border-gray-100",children:[(0,a.jsxs)("div",{className:"flex justify-between items-center px-8 py-4",children:[(0,a.jsx)(n.E.button,{onClick:()=>{i>0&&(f(-1),d(i-1))},disabled:0===i,className:"text-sm text-black hover:text-red-500 transition-colors disabled:opacity-50 disabled:hover:text-black",children:"PREV"}),(0,a.jsxs)("span",{className:"text-sm text-black",children:[i+1," / ",t.length]}),(0,a.jsx)(n.E.button,{onClick:()=>{i<t.length-1&&(f(1),d(i+1))},disabled:i===t.length-1,className:"text-sm text-black hover:text-red-500 transition-colors disabled:opacity-50 disabled:hover:text-black",children:"NEXT"})]}),b.text&&(0,a.jsx)("div",{className:"px-8 py-4 border-t border-gray-100",children:(0,a.jsx)("p",{className:"text-sm text-black font-light",children:b.text})})]})]})}}},function(e){e.O(0,[845,473,971,938,744],function(){return e(e.s=3115)}),_N_E=e.O()}]);