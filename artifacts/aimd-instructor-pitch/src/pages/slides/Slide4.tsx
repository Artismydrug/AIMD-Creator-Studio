export default function Slide4() {
  return <div className="relative w-screen h-screen overflow-hidden" style={{background:'#FFFBF0',fontFamily:"'DM Sans', sans-serif"}}>
    <div className="absolute" style={{top:0,left:0,width:'16vw',height:'100vh',background:'#FF4D00'}} /><div className="absolute" style={{top:'12vh',left:'8vw',width:'6vw',height:'6vw',border:'2px solid #12110F',borderRadius:'50%'}} />
    <div className="relative flex flex-col justify-between h-full" style={{padding:'6vh 6vw'}}>
      <div className="flex justify-between items-start"><div style={{fontSize:'1.3vw',fontWeight:700}}>AIMD</div><div style={{fontSize:'0.9vw',textTransform:'uppercase',letterSpacing:'0.2em'}}>03 / The learner journey</div></div>
      <div style={{flex:1,marginTop:'8vh',paddingLeft:'14vw'}}><div style={{fontSize:'0.9vw',textTransform:'uppercase',letterSpacing:'0.25em',color:'#FF4D00',fontWeight:600,marginBottom:'1.5vh'}}>The learner journey</div><h2 style={{fontSize:'4.5vw',fontWeight:700,lineHeight:1,letterSpacing:'-0.05em',margin:0,maxWidth:'60vw'}}>A clear path<br/>from lesson to record</h2><div style={{marginTop:'7vh',borderTop:'2px solid #12110F',paddingTop:'3vh',display:'grid',gridTemplateColumns:'repeat(5, 1fr)',gap:'1.3vw'}}>
        <div><div style={{fontSize:'3vw',fontWeight:700,color:'#FF4D00'}}>01</div><div style={{fontSize:'1.45vw',fontWeight:700,marginTop:'1vh'}}>Enter through a workshop</div></div>
        <div><div style={{fontSize:'3vw',fontWeight:700,color:'#FF4D00'}}>02</div><div style={{fontSize:'1.45vw',fontWeight:700,marginTop:'1vh'}}>Watch the lesson and understand the objective</div></div>
        <div><div style={{fontSize:'3vw',fontWeight:700,color:'#FF4D00'}}>03</div><div style={{fontSize:'1.45vw',fontWeight:700,marginTop:'1vh'}}>Complete a focused 30-second drill</div></div>
        <div><div style={{fontSize:'3vw',fontWeight:700,color:'#FF4D00'}}>04</div><div style={{fontSize:'1.45vw',fontWeight:700,marginTop:'1vh'}}>Capture proof of practice and submit the assignment</div></div>
        <div><div style={{fontSize:'3vw',fontWeight:700,color:'#FF4D00'}}>05</div><div style={{fontSize:'1.45vw',fontWeight:700,marginTop:'1vh'}}>Receive human review and keep building a visible studio record</div></div>
      </div></div>
      <div className="flex justify-between" style={{fontSize:'0.9vw',color:'#999',textTransform:'uppercase',letterSpacing:'0.1em'}}><span>Creator Studio by AIMD</span><span>04</span></div>
    </div>
  </div>;
}