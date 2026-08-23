const base = import.meta.env.BASE_URL;
export default function Slide1() {
  return <div className="relative w-screen h-screen overflow-hidden" style={{background:'#FFFBF0',fontFamily:"'DM Sans', sans-serif"}}>
    <div className="absolute" style={{top:'8vh',right:'6vw',width:'38vw',height:'75vh',background:'#FF4D00',borderRadius:'2vw',overflow:'hidden'}}>
      <img src={base + 'hero.jpg'} crossOrigin="anonymous" alt="Artist working in a warm studio" style={{width:'100%',height:'100%',objectFit:'cover',mixBlendMode:'multiply',opacity:0.48}} />
      <div className="absolute" style={{inset:0,background:'linear-gradient(135deg, rgba(255,77,0,0.16), rgba(18,17,15,0.24))'}} />
    </div>
    <div className="absolute" style={{top:'12vh',right:'8vw',width:'10vw',height:'10vw',border:'3px solid #12110F',borderRadius:'50%'}} />
    <div className="relative flex flex-col justify-between h-full" style={{padding:'6vh 6vw'}}>
      <div className="flex justify-between items-start"><div style={{fontSize:'1.3vw',fontWeight:700}}>AIMD</div><div style={{fontSize:'0.9vw',textTransform:'uppercase',letterSpacing:'0.15em',writingMode:'vertical-rl',transform:'rotate(180deg)'}}>Instructor Briefing · 2026</div></div>
      <div style={{maxWidth:'50vw'}}><div style={{fontSize:'0.9vw',textTransform:'uppercase',letterSpacing:'0.25em',color:'#FF4D00',fontWeight:600,marginBottom:'1.5vh'}}>The instructor opportunity</div><h1 style={{fontSize:'6.5vw',fontWeight:700,lineHeight:0.9,letterSpacing:'-0.06em',margin:0}}>Creator<br/>Studio by<br/>AIMD</h1><p style={{fontSize:'1.5vw',color:'#6D6A64',marginTop:'3vh',maxWidth:'35vw',lineHeight:1.45}}>A practice-first home for artists to learn, document, and grow</p></div>
      <div className="flex gap-[3vw]" style={{fontSize:'0.9vw',color:'#999',textTransform:'uppercase',letterSpacing:'0.1em'}}><span>Instructor briefing · 2026</span><span>Creator Studio by AIMD</span></div>
    </div>
  </div>;
}