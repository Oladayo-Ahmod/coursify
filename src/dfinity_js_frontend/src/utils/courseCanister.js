import { Principal } from "@dfinity/principal";
import { transferICP } from "./ledger";

export async function addCourse(courseData) {
  return window.canister.marketplace.addCourse(courseData);
}

export async function enrollCourse(courseId) {
  return window.canister.marketplace.enrollCourse(courseId);
}

export async function buyCourse(courseId) {
  const courseCanister = window.canister.marketplace;
  const orderResponse = await marketplace.createOrder(courseId);
  const sellerPrincipal = Principal.from(orderResponse.Ok.seller);
  const sellerAddress = await courseCanister.getAddressFromPrincipal(sellerPrincipal);
  const block = await transferICP(sellerAddress, orderResponse.Ok.price, orderResponse.Ok.memo);
  await courseCanister.completePurchase(sellerPrincipal, courseId, orderResponse.Ok.price, block, orderResponse.Ok.memo);
}

export async function getCourses() {
  try {
    return await window.canister.marketplace.getCourses();
  } catch (err) {
    if (err.name === "AgentHTTPResponseError") {
      const authClient = window.auth.client;
      await authClient.logout();
    }
    return [];
  }
}
export async function getUserEnrolledCourses() {
  try {
    return await window.canister.marketplace.getUserEnrolledCourses();
  } catch (err) {
    console.error("Error fetching enrolled courses:", err);
    return [];
  }
}

export async function getUserCreatedCourses() {
  try {
    return await window.canister.marketplace.getUserCreatedCourses();
  } catch (err) {
    console.error("Error fetching created courses:", err);
    return [];
  }
}

