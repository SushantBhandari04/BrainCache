import Dashboard from "./pages/dashboard"
import SharedDashboard from "./pages/sharedDashboard"
import Signin from "./pages/signin"

import { BrowserRouter, Routes, Route } from "react-router-dom"
import Signup from "./pages/signup"
import Profile from "./pages/profile"
import LandingPage from "./pages/LandingPage"

function App(){
    return <>
        <BrowserRouter>
            <Routes>
                <Route path="/">
                    <Route index element={<LandingPage/>}/>
                    <Route path="/user/signup" element={<Signup/>}/>
                    <Route path="/user/signin" element={<Signin/>}/>
                    <Route path="/user/dashboard" element={<Dashboard/>}/>
                <Route path="/user/profile" element={<Profile/>}/>
                <Route path="/share/:hash" element={<SharedDashboard/>}/>
                </Route>
            </Routes>
        </BrowserRouter>
    </>
}

export default App