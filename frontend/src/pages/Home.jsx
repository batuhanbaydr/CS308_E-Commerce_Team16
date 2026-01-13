// src/pages/Home.jsx
import React from "react";
import CategoryTopbar from "../components/CategoryTopbar.jsx";

import sweatshirt1 from "../assets/sweatshirt1.jpg";
import sweatshirt2 from "../assets/sweatshirt2.jpg";
import sweatpants1 from "../assets/sweatpants1.jpg";
import shirt1 from "../assets/shirt1.jpg";
import sweatshirt3 from "../assets/sweatshirt3.jpg";

export default function Home() {
  return (
    <div className="category-page">
      {/* ✅ ONE consistent dynamic topbar everywhere */}
      <CategoryTopbar />

      {/* ✅ your design stays exactly the same */}
      <section className="hero">
        <div className="hero-ellipse" />
        <img src={sweatshirt1} alt="sweatshirt" className="hero-img hero-left" />
        <img src={sweatshirt2} alt="sweatshirt" className="hero-img hero-center" />
        <img src={sweatpants1} alt="sweatpants" className="hero-img hero-right" />
        <div className="hero-quote">LESS, BUT BETTER.</div>
      </section>

      <section className="hero2">
        <img src={sweatshirt3} alt="sweatshirt" className="hero2-img hero2-left" />
        <div className="hero2-quote">
          QUIET MOMENTS IN<br />MOTION.
        </div>
        <img src={shirt1} alt="shirt" className="hero2-img hero2-right" />
      </section>
    </div>
  );
}
