export default function Slide6() {
  return <div className="relative w-screen h-screen overflow-hidden" style={{background:'#FFFBF0',fontFamily:"'DM Sans', sans-serif"}}>
    <div className="absolute" style={{top:0,right:0,width:'8vw',height:'100vh',background:'#FF4D00'}} /><div className="relative flex flex-col justify-between h-full" style={{padding:'6vh 6vw'}}>
      <div className="flex justify-between items-start"><div style={{fontSize:'1.3vw',fontWeight:700}}>AIMD</div><div style={{fontSize:'0.9vw',textTransform:'uppercase',letterSpacing:'0.2em'}}>05 / The teaching standard</div></div>
      <div style={{flex:1,marginTop:'7vh'}}><div style={{fontSize:'0.9vw',textTransform:'uppercase',letterSpacing:'0.25em',color:'#FF4D00',fontWeight:600,marginBottom:'1.5vh'}}>The teaching standard</div><div className="flex items-end justify-between"><h2 style={{fontSize:'4.5vw',fontWeight:700,lineHeight:1,letterSpacing:'-0.05em',margin:0}}>Focused practice.<br/>Trustworthy progress.</h2><div style={{fontSize:'9vw',fontWeight:700,lineHeight:0.8,color:'#FF4D00',letterSpacing:'-0.08em'}}>30s</div></div><div className="grid grid-cols-2 gap-x-[5vw] gap-y-[2.5vh]" style={{marginTop:'7vh',maxWidth:'73vw'}}>
        <div style={{borderTop:'2px solid #12110F',paddingTop:'1.8vh',fontSize:'1.75vw',fontWeight:700}}>Drills are capped at 30 seconds to protect focus and consistency</div>
        <div style={{borderTop:'2px solid #12110F',paddingTop:'1.8vh',fontSize:'1.75vw',fontWeight:700}}>Lesson completion stays unavailable when instructor video is missing</div>
        <div style={{borderTop:'2px solid #12110F',paddingTop:'1.8vh',fontSize:'1.75vw',fontWeight:700}}>Access rules are enforced by the platform—not by trust alone</div>
        <div style={{borderTop:'2px solid #12110F',paddingTop:'1.8vh',fontSize:'1.75vw',fontWeight:700}}>The official tattoo apprenticeship path includes six modules and twelve drills</div>
        <div style={{borderTop:'2px solid #12110F',paddingTop:'1.8vh',fontSize:'1.75vw',fontWeight:700,gridColumn:'span 2'}}>Paid instructor-led experiences can expand when the learning assets are ready</div>
      </div></div>
      <div className="flex justify-between" style={{fontSize:'0.9vw',color:'#999',textTransform:'uppercase',letterSpacing:'0.1em'}}><span>Creator Studio by AIMD</span><span>06</span></div>
    </div>
  </div>;
}