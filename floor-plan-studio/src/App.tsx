import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { DashboardPage } from './pages/DashboardPage';
import { NewRoomPage } from './pages/NewRoomPage';
import { RoomEditorPage } from './pages/RoomEditorPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/rooms/new" element={<NewRoomPage />} />
        <Route path="/rooms/:roomId" element={<RoomEditorPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
