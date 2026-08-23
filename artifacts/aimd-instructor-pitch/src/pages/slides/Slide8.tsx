export default function Slide8() {
  return <div className="relative w-screen h-screen overflow-hidden" style={{background:'#12110F',fontFamily:"'DM Sans', sans-serif",color:'#FFFBF0'}}>
    <div className="absolute" style={{top:'8vh',right:'7vw',width:'24vw',height:'24vw',border:'2px solid #FF4D00',borderRadius:'50%',opacity:0.9}} /><div className="absolute" style={{bottom:0,left:0,width:'28vw',height:'8vh',background:'#FF4D00'}} />
    <div className="relative flex flex-col justify-between h-full" style={{padding:'6vh 6vw'}}>
      <div className="flex justify-between items-start"><div style={{fontSize:'1.3vw',fontWeight:700}}>AIMD</div><div style={{fontSize:'0.9vw',textTransform:'uppercase',letterSpacing:'0.2em',color:'#FF4D00'}}>07 / The commitment</div></div>
      <div style={{flex:1,marginTop:'8vh',display:'flex',gap:'8vw'}}><div style={{flex:'0 0 38%'}}><div style={{fontSize:'0.9vw',textTransform:'uppercase',letterSpacing:'0.25em',color:'#FF4D00',fontWeight:600,marginBottom:'1.5vh'}}>The commitment</div><h2 style={{fontSize:'5vw',fontWeight:700,lineHeight:0.95,letterSpacing:'-0.06em',margin:0}}>What you are<br/>getting into</h2></div><div style={{flex:1,paddingTop:'2vh'}}>
        <div style={{borderTop:'2px solid #FF4D00',paddingTop:'1.8vh',marginBottom:'2.5vh',fontSize:'1.8vw',fontWeight:700}}>Bring a repeatable method—not just isolated tips</div>
        <div style={{borderTop:'2px solid #FF4D00',paddingTop:'1.8vh',marginBottom:'2.5vh',fontSize:'1.8vw',fontWeight:700}}>Record the lesson assets learners need to complete the path</div>
        <div style={{borderTop:'2px solid #FF4D00',paddingTop:'1.8vh',marginBottom:'2.5vh',fontSize:'1.8vw',fontWeight:700}}>Design drills with a clear constraint and observable outcome</div>
        <div style={{borderTop:'2px solid #FF4D00',paddingTop:'1.8vh',marginBottom:'2.5vh',fontSize:'1.8vw',fontWeight:700}}>Give feedback that is specific, respectful, and actionable</div>
        <div style={{borderTop:'2px solid #FF4D00',paddingTop:'1.8vh',fontSize:'1.8vw',fontWeight:700}}>Help create a culture of discipline, safety, and steady improvement</div>
      </div></div>
      <div className="flex justify-between" style={{fontSize:'0.9vw',color:'#999',textTransform:'uppercase',letterSpacing:'0.1em'}}><span>Creator Studio by AIMD</span><span style={{color:'#FF4D00'}}>08</span></div>
    </div>
  </div>;
}