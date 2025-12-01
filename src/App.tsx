import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { Exercises } from './pages/Exercises';
import { Session } from './pages/Session';

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Layout />}>
                    <Route index element={<Home />} />
                    <Route path="exercises" element={<Exercises />} />
                    <Route path="session/:id" element={<Session />} />
                </Route>
            </Routes>
        </BrowserRouter>
    );
}

export default App;
