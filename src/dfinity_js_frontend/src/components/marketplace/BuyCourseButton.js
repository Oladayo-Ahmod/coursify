// BuyCourseButton.js

import React from "react";
import { buyCourse } from "../../utils/courseCanister";

const BuyCourseButton = ({ courseId }) => {
  const handleBuy = async () => {
    try {
      await buyCourse(courseId);
      alert("Course purchased successfully!");
    } catch (error) {
      console.error("Error purchasing course:", error);
      alert("Failed to purchase course. Please try again.");
    }
  };

  return (
    <button onClick={handleBuy}>
      Buy Course
    </button>
  );
};

export default BuyCourseButton;
