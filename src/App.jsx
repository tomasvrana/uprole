import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/layout';
import Home from './pages/Home';
import Search from './pages/Search/Search';
import Profile from './pages/Profile';
import EditProfile from './pages/Profile/EditProfile';
import AddSkill from './pages/Skills/AddSkill';
import EditSkill from './pages/Skills/EditSkill';
import Chat from './pages/Chat/Chat';
import Login from './pages/Auth/Login';
import { Register } from './pages/Auth';
import useAuthStore from './stores/authStore';
import './i18n/config';
import './styles/globals.css';

function App() {
  const initialize = useAuthStore((state) => state.initialize);

  useEffect(() => {
    const unsubscribe = initialize();
    return () => unsubscribe();
  }, [initialize]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="search" element={<Search />} />
          <Route path="profile/edit" element={<EditProfile />} />
          <Route path="profile/add-skill" element={<AddSkill />} />
          <Route path="profile/edit-skill/:skillId" element={<EditSkill />} />
          <Route path="profile/:userId" element={<Profile />} />
          <Route path="messages" element={<Chat />} />
          <Route path="messages/:conversationId" element={<Chat />} />
          <Route path="login" element={<Login />} />
          <Route path="register" element={<Register />} />
          <Route path=":profileSlug" element={<Profile />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
