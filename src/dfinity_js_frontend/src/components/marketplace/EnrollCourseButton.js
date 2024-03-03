// EnrollCourseButton.js

import React from "react";
import { enrollCourse } from "../../utils/courseCanister";

const EnrollCourseButton = ({ courseId }) => {
  const handleEnroll = async () => {
    try {
      await enrollCourse(courseId);
      alert("Enrolled successfully!");
    } catch (error) {
      console.error("Error enrolling in course:", error);
      alert("Failed to enroll in course. Please try again.");
    }
  };

  return (
    <button onClick={handleEnroll}>
      Enroll in Course
    </button>
  );
};

export default EnrollCourseButton;
