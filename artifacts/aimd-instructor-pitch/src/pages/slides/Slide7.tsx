export default function Slide7() {
  return <div className="relative w-screen h-screen overflow-hidden" style={{background:'#FFFBF0',fontFamily:"'DM Sans', sans-serif"}}>
    <div className="absolute" style={{bottom:0,right:0,width:'31vw',height:'42vh',background:'#FF4D00'}} /><div className="absolute" style={{bottom:'12vh',right:'10vw',width:'12vw',height:'12vw',border:'3px solid #12110F',borderRadius:'50%'}} />
    <div className="relative flex flex-col justify-between h-full" style={{padding:'6vh 6vw'}}>
      <div className="flex justify-between items-start"><div style={{fontSize:'1.3vw',fontWeight:700}}>AIMD</div><div style={{fontSize:'0.9vw',textTransform:'uppercase',letterSpacing:'0.2em'}}>06 / The community</div></div>
      <div style={{flex:1,marginTop:'7vh',display:'flex',gap:'6vw'}}><div style={{flex:'0 0 42%'}}><div style={{fontSize:'0.9vw',textTransform:'uppercase',letterSpacing:'0.25em',color:'#FF4D00',fontWeight:600,marginBottom:'1.5vh'}}>The community</div><h2 style={{fontSize:'4.5vw',fontWeight:700,lineHeight:1,letterSpacing:'-0.05em',margin:0}}>A social layer<br/>built for the studio</h2><div style={{marginTop:'5vh',width:'15vw',height:'10vh',background:'#12110F',padding:'2vh 1.5vw',color:'#FFFBF0'}}><div style={{fontSize:'1.1vw',color:'#FF4D00',textTransform:'uppercase',letterSpacing:'0.15em'}}>Creator Studio</div><div style={{fontSize:'1.5vw',fontWeight:700,marginTop:'1vh'}}>Make the work visible.</div></div></div><div style={{flex:1,paddingTop:'3vh'}}>
        <div style={{borderTop:'2px solid #12110F',paddingTop:'1.8vh',marginBottom:'2.5vh',fontSize:'1.8vw',fontWeight:700}}>Public creator profiles show craft, progress, and selected badges</div>
        <div style={{borderTop:'2px solid #12110F',paddingTop:'1.8vh',marginBottom:'2.5vh',fontSize:'1.8vw',fontWeight:700}}>Artists can follow creators whose work they want to learn from</div>
        <div style={{borderTop:'2px solid #12110F',paddingTop:'1.8vh',marginBottom:'2.5vh',fontSize:'1.8vw',fontWeight:700}}>Feed views support All Posts and Following Only</div>
        <div style={{borderTop:'2px solid #12110F',paddingTop:'1.8vh',marginBottom:'2.5vh',fontSize:'1.8vw',fontWeight:700}}>Avatars, mediums, locations, and studio identity make creators discoverable</div>
        <div style={{borderTop:'2px solid #12110F',paddingTop:'1.8vh',fontSize:'1.8vw',fontWeight:700}}>Privacy boundaries keep email, identity IDs, and private upload paths out of public profiles</div>
      </div></div>
      <div className="flex justify-between" style={{fontSize:'0.9vw',color:'#999',textTransform:'uppercase',letterSpacing:'0.1em'}}><span>Creator Studio by AIMD</span><span>07</span></div>
    </div>
  </div>;
}