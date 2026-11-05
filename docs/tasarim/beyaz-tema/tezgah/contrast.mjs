const hex2rgb=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)/255);
const lin=c=>c<=0.04045?c/12.92:((c+0.055)/1.055)**2.4;
const unlin=c=>c<=0.0031308?12.92*c:1.055*c**(1/2.4)-0.055;
export const L=h=>{const[r,g,b]=hex2rgb(h).map(lin);return .2126*r+.7152*g+.0722*b};
export const cr=(a,b)=>{const x=L(a),y=L(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)};
// OKLab
const toOk=h=>{const[r,g,b]=hex2rgb(h).map(lin);const l=Math.cbrt(.4122214708*r+.5363325363*g+.0514459929*b),m=Math.cbrt(.2119034982*r+.6806995451*g+.1073969566*b),s=Math.cbrt(.0883024619*r+.2817188376*g+.6299787005*b);return[.2104542553*l+.793617785*m-.0040720468*s,1.9779984951*l-2.428592205*m+.4505937099*s,.0259040371*l+.7827717662*m-.808675766*s]};
const fromOk=([L,a,b])=>{const l=(L+.3963377774*a+.2158037573*b)**3,m=(L-.1055613458*a-.0638541728*b)**3,s=(L-.0894841775*a-1.291485548*b)**3;const rgb=[4.0767416621*l-3.3077115913*m+.2309699292*s,-1.2684380046*l+2.6097574011*m-.3413193965*s,-.0041960863*l-.7034186147*m+1.707614701*s];return '#'+rgb.map(c=>Math.round(Math.min(1,Math.max(0,unlin(Math.min(1,Math.max(0,c)))))*255).toString(16).padStart(2,'0')).join('').toUpperCase()};
// darken keeping hue/chroma ratio until contrast >= t against all grounds
export const darkenTo=(h,grounds,t)=>{let [l,a,b]=toOk(h);for(let i=0;i<200;i++){const x=fromOk([l,a,b]);if(grounds.every(g=>cr(x,g)>=t))return x;l-=0.004;a*=0.997;b*=0.997}return null};
