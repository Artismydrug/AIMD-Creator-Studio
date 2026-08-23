export default function Slide2() {
  return <div className="relative w-screen h-screen overflow-hidden" style={{background:'#FFFBF0',fontFamily:"'DM Sans', sans-serif"}}>
    <div className="absolute" style={{top:0,right:0,width:'8vw',height:'100vh',background:'#FF4D00'}} /><div className="absolute" style={{bottom:'10vh',right:'12vw',width:'6vw',height:'6vw',border:'2px solid #FF4D00',borderRadius:'50%',opacity:0.3}} />
    <div className="relative flex flex-col justify-between h-full" style={{padding:'6vh 6vw'}}>
      <div className="flex justify-between items-start"><div style={{fontSize:'1.3vw',fontWeight:700}}>AIMD</div><div style={{fontSize:'0.9vw',color:'#FF4D00',textTransform:'uppercase',letterSpacing:'0.25em',fontWeight:600}}>01 / The premise</div></div>
      <div style={{flex:1,marginTop:'8vh',paddingTop:'4vh'}}><div style={{fontSize:'0.9vw',textTransform:'uppercase',letterSpacing:'0.25em',color:'#FF4D00',fontWeight:600,marginBottom:'1.5vh'}}>Why this matters</div><h2 style={{fontSize:'4.5vw',fontWeight:700,lineHeight:0.98,letterSpacing:'-0.05em',margin:0,maxWidth:'50vw'}}>From instruction<br/>to evidence</h2><div className="grid grid-cols-4 gap-[2vw]" style={{marginTop:'8vh'}}>
        <div style={{borderTop:'2px solid #12110F',paddingTop:'2vh'}}><div style={{fontSize:'3.5vw',fontWeight:700,color:'#FF4D00'}}>01</div><div style={{fontSize:'1.7vw',fontWeight:700,marginTop:'1vh'}}>Turn your expertise into a guided learning path</div></div>
        <div style={{borderTop:'2px solid #12110F',paddingTop:'2vh'}}><div style={{fontSize:'3.5vw',fontWeight:700,color:'#FF4D00'}}>02</div><div style={{fontSize:'1.7vw',fontWeight:700,marginTop:'1vh'}}>Give artists a place to practice—not just watch</div></div>
        <div style={{borderTop:'2px solid #12110F',paddingTop:'2vh'}}><div style={{fontSize:'3.5vw',fontWeight:700,color:'#FF4D00'}}>03</div><div style={{fontSize:'1.7vw',fontWeight:700,marginTop:'1vh'}}>Make progress visible through drills, assignments, and milestones</div></div>
        <div style={{borderTop:'2px solid #12110F',paddingTop:'2vh'}}><div style={{fontSize:'3.5vw',fontWeight:700,color:'#FF4D00'}}>04</div><div style={{fontSize:'1.7vw',fontWeight:700,marginTop:'1vh'}}>Build a community around consistent craft</div></div>
      </div></div>
      <div className="flex justify-between" style={{fontSize:'0.9vw',color:'#999',textTransform:'uppercase',letterSpacing:'0.1em'}}><span>Creator Studio by AIMD</span><span>02</span></div>
    </div>
  </div>;
}