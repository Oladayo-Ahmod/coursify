import React, { useState, useEffect } from "react";
import { getUserCreatedCourses} from "../../utils/courseCanister";

const MyCourseList = () => {
  // State to hold the list of courses
  const [courses, setCourses] = useState([]);

  // Fetch courses when the component mounts
  useEffect(() => {
    fetchCourses();
  }, []);

  // Function to fetch courses from the backend
  const fetchCourses = async () => {
    try {
      const coursesData = await getUserCreatedCourses();
      console.log(coursesData);
      setCourses(coursesData);
    } catch (error) {
      console.error("Error fetching courses:", error);
    }
  };


  // Function to generate a random image URL with a unique seed based on the course title
  const generateRandomImage = (title) => {
    const width = 400;
    const height = 300;
    const seed = title.replace(/\s+/g, "-").toLowerCase();
    return `https://picsum.photos/seed/${seed}/${width}/${height}`;
  };

  return (
    <div className="container mt-5">
      <h2 className="mb-5 text-primary fw-bold">My Courses</h2>
      <div className="row row-cols-1 row-cols-md-3 g-4">
        {/* Map over the courses array and display each course */}
        {courses.map((course) => (
          <div key={course.id} className="col">
            <div className="card shadow">
              <img src={generateRandomImage(course.title)} className="card-img-top" alt="Course" />
              <div className="card-body">
                <h5 className="card-title">{course.title}</h5>
                <p className="card-text">{course.description}</p>
                <p className="card-text">Duration: {Number(course.duration)} seconds</p>
                <p className="card-text">Prerequisites: {course.prerequisites.join(", ")}</p>
                <p className="card-text">Price: {Number(course.price)}</p>
                <p className="card-text">Skill Level: {course.skillLevel}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MyCourseList;