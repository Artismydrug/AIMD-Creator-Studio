export default function Slide9() {
  return <div className="relative w-screen h-screen overflow-hidden" style={{background:'#FFFBF0',fontFamily:"'DM Sans', sans-serif"}}>
    <div className="absolute" style={{top:0,right:0,width:'8vw',height:'100vh',background:'#FF4D00'}} /><div className="absolute" style={{top:'12vh',right:'18vw',width:'8vw',height:'8vw',border:'2px solid #12110F',transform:'rotate(45deg)'}} />
    <div className="relative flex flex-col justify-between h-full" style={{padding:'6vh 6vw'}}>
      <div className="flex justify-between items-start"><div style={{fontSize:'1.3vw',fontWeight:700}}>AIMD</div><div style={{fontSize:'0.9vw',textTransform:'uppercase',letterSpacing:'0.2em'}}>08 / The partnership</div></div>
      <div style={{flex:1,marginTop:'7vh'}}><div style={{fontSize:'0.9vw',textTransform:'uppercase',letterSpacing:'0.25em',color:'#FF4D00',fontWeight:600,marginBottom:'1.5vh'}}>The partnership</div><h2 style={{fontSize:'4.5vw',fontWeight:700,lineHeight:1,letterSpacing:'-0.05em',margin:0}}>The partnership model</h2><div style={{marginTop:'7vh',display:'grid',gridTemplateColumns:'repeat(5, 1fr)',gap:'1.4vw'}}>
        <div style={{borderTop:'3px solid #FF4D00',paddingTop:'2vh'}}><div style={{fontSize:'3.2vw',fontWeight:700}}>01</div><div style={{fontSize:'1.55vw',fontWeight:700,marginTop:'1vh'}}>Start with one focused pilot workshop</div></div>
        <div style={{borderTop:'3px solid #FF4D00',paddingTop:'2vh'}}><div style={{fontSize:'3.2vw',fontWeight:700}}>02</div><div style={{fontSize:'1.55vw',fontWeight:700,marginTop:'1vh'}}>Map the promise, modules, lessons, drills, and review moments</div></div>
        <div style={{borderTop:'3px solid #FF4D00',paddingTop:'2vh'}}><div style={{fontSize:'3.2vw',fontWeight:700}}>03</div><div style={{fontSize:'1.55vw',fontWeight:700,marginTop:'1vh'}}>Invite a small group of artists into the experience</div></div>
        <div style={{borderTop:'3px solid #FF4D00',paddingTop:'2vh'}}><div style={{fontSize:'3.2vw',fontWeight:700}}>04</div><div style={{fontSize:'1.55vw',fontWeight:700,marginTop:'1vh'}}>Review learner questions and submissions with the AIMD team</div></div>
        <div style={{borderTop:'3px solid #FF4D00',paddingTop:'2vh'}}><div style={{fontSize:'3.2vw',fontWeight:700}}>05</div><div style={{fontSize:'1.55vw',fontWeight:700,marginTop:'1vh'}}>Refine the path before expanding into a larger masterclass or career pipeline</div></div>
      </div></div>
      <div className="flex justify-between" style={{fontSize:'0.9vw',color:'#999',textTransform:'uppercase',letterSpacing:'0.1em'}}><span>Creator Studio by AIMD</span><span>09</span></div>
    </div>
  </div>;
}