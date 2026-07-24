'use client'

import ReactAudioPlayer from 'react-audio-player';

function App() {
  return (
    <div>
      <ReactAudioPlayer
        src="ruta-del-archivo-de-audio.mp3"
        autoPlay
        controls
      />
    </div>
  );
}

export default App;