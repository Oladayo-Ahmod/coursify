import React, { useState } from "react";
import { Button, Modal } from "react-bootstrap";
import Swal from "sweetalert2"; // Import SweetAlert
import { addCourse } from "../../utils/courseCanister";

const AddCourseForm = () => {
  // State variables for form fields and modal visibility
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState("");
  const [prerequisites, setPrerequisites] = useState("");
  const [price, setPrice] = useState("");
  const [skillLevel, setSkillLevel] = useState("");

  // Function to handle modal close
  const handleClose = () => setShowModal(false);
  
  // Function to handle modal open
  const handleShow = () => setShowModal(true);

  // Function to handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Call addCourse function with form data
      await addCourse({
        title,
        description,
        duration: BigInt(duration), // Convert duration to BigInt
        skillLevel,
        prerequisites: prerequisites.split(","), // Split prerequisites by comma
        price: BigInt(price), // Convert price to BigInt
      });

      // Clear form fields and close modal on success
      setTitle("");
      setDescription("");
      setDuration("");
      setPrerequisites("");
      setPrice("");
      handleClose();

      // Show success message using SweetAlert
      Swal.fire({
        icon: "success",
        title: "Success!",
        text: "Course added successfully!",
      });
    } catch (error) {
      // Log error to console
      console.error("Error adding course:", error);

      // Show error message using SweetAlert
      Swal.fire({
        icon: "error",
        title: "Oops...",
        text: "Failed to add course. Please try again.",
      });
    }
  };

  return (
    <div className="btn-container">
      {/* Button to trigger modal */}
      <Button className="btn btn-primary btn-lg" onClick={handleShow}>
        Add Course
      </Button>

      {/* Modal for adding course */}
      <Modal show={showModal} onHide={handleClose}>
        <Modal.Header closeButton>
          <Modal.Title>Add Course</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {/* Form for adding course */}
          <form onSubmit={handleSubmit}>
            {/* Title input */}
            <div className="mb-3">
              <label>Title:</label>
              <input
                type="text"
                className="form-control"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>
            {/* Description textarea */}
            <div className="mb-3">
              <label>Description:</label>
              <textarea
                className="form-control"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </div>
            {/* Duration input */}
            <div className="mb-3">
              <label>Duration (seconds):</label>
              <input
                type="number"
                className="form-control"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                required
              />
            </div>
            {/* Prerequisites input */}
            <div className="mb-3">
              <label>Prerequisites:</label>
              <input
                type="text"
                className="form-control"
                placeholder="Separate by comma"
                value={prerequisites}
                onChange={(e) => setPrerequisites(e.target.value)}
              />
            </div>
            {/* Price input */}
            <div className="mb-3">
              <label>Price:</label>
              <input
                type="number"
                className="form-control"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
              />
            </div>
            {/* Skill Level input */}
            <div className="mb-3">
              <label>Skill Level:</label>
              <input
                type="text"
                className="form-control"
                value={skillLevel}
                onChange={(e) => setSkillLevel(e.target.value)}
                required
              />
            </div>
            {/* Submit button */}
            <Button variant="primary" type="submit">
              Add Course
            </Button>
          </form>
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default AddCourseForm;
