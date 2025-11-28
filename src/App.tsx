import { Route, Routes } from "react-router-dom";
import HomePage from "./pages/HomePage";
import ReviewPage from "./pages/ReviewPage";
import SearchPage from "./pages/SearchPage";

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/review/:id" element={<ReviewPage />} />
      <Route path="/search" element={<SearchPage />} />
    </Routes>
  );
};

export default App;
