import { query, update, text, Record, StableBTreeMap, Variant, Vec, None, Some, Ok, Err, ic, Principal, Opt, nat64, Duration, Result, bool, Canister } from "azle";
import {
  Ledger, binaryAddressFromAddress, binaryAddressFromPrincipal, hexAddressFromPrincipal
} from "azle/canisters/ledger";
import { hashCode } from "hashcode";
import { v4 as uuidv4 } from "uuid";

// Define record types for courses, users, and transactions
const Course = Record({
  id: text,
  title: text,
  description: text,
  instructor: Principal,
  duration: nat64,
  skillLevel: text,
  prerequisites: Vec(text),
  price: nat64, // Price of the course in ICP tokens
  students: Vec(Principal) // List of students enrolled in the course
});

const User = Record({
  id: Principal,
  username: text,
  bio: text,
  skills: Vec(text),
  enrolledCourses: Vec(Principal), // List of course IDs the user is enrolled in
  purchasedCourses: Vec(text) // List of course IDs the user has purchased
});

type Transaction = {
  id: string,
  from: Principal,
  to: Principal,
  amount: nat64,
  memo: string,
  status: string // Status of the transaction: "Pending", "Completed", or "Failed"
};

// Define message variants for error handling and responses
const Message = Variant({
    NotFound: text,
    InvalidPayload: text,
    PaymentFailed: text,
    PaymentCompleted: text
});

// Define a StableBTreeMap to store courses by their IDs
const coursesStorage = StableBTreeMap(0, text, Course);
const usersStorage = StableBTreeMap(1, Principal, User);

// const transactionsStorage = StableBTreeMap(2, text, Transaction);
// Define a StableBTreeMap to store transactions by their IDs
const transactionsStorage = StableBTreeMap(2, text, Record({
    id: text,
    from: Principal,
    to: Principal,
    amount: nat64,
    memo: text,
    status: text
}));

/* 
    initialization of the Ledger canister. The principal text value is hardcoded because 
    we set it in the `dfx.json`
*/
const icpCanister = Ledger(Principal.fromText("ryjl3-tyaaa-aaaaa-aaaba-cai"));

// Define the main canister interface
export default Canister({
    // Query function to retrieve a list of available courses
    getCourses: query([], Vec(Course), () => {
        return coursesStorage.values();
    }),

     // Query function to retrieve details of a specific course by its ID
     getCourse: query([text], Result(Course, Message), (id) => {
        const courseOpt = coursesStorage.get(id);
        if ("None" in courseOpt) {
            return Err({ NotFound: `Course with ID ${id} not found` });
        }
        return Ok(courseOpt.Some);
    }),

    // Query function to retrieve courses enrolled by the user
    getUserEnrolledCourses: query([], Result(Vec(Course), Message), () => {
        const currentUser = ic.caller();
        const enrolledCourses = coursesStorage.values().filter(course => course.students.some(student => student.toString() === currentUser.toString()));
        if (enrolledCourses.length === 0) {
            return Err({ NotFound: `No enrolled courses found for user ${currentUser}` });
        }
        const courseVec = enrolledCourses.map(course => {
            const { id, title, description, instructor, duration, skillLevel, prerequisites, price, students } = course;
            return { id, title, description, instructor, duration, skillLevel, prerequisites, price, students };
        });
        return Ok(courseVec);
    }),

      
    // Query function to retrieve courses created by the user
    getUserCreatedCourses: query([], Result(Vec(Course), Message), () => {
        const currentUser = ic.caller();
        const createdCourses = coursesStorage.values().filter(course => course.instructor.toText() === currentUser.toText());
        if (createdCourses.length === 0) {
            return Err({ NotFound: `No courses found for user ${currentUser}` });
        }
        const courseVec = createdCourses.map(course => {
            const { id, title, description, instructor, duration, skillLevel, prerequisites, price, students } = course;
            return { id, title, description, instructor, duration, skillLevel, prerequisites, price, students };
        });
        return Ok(courseVec);
    }),    

    // Update function to add a new course to the platform
    addCourse: update([Record({ title: text, description: text, duration: nat64, skillLevel: text, prerequisites: Vec(text), price: nat64 })], Result(text, Message), (payload) => {
    const currentUser = ic.caller();
    const course = { id: uuidv4(), instructor: currentUser, students: [currentUser], ...payload }; // Enroll the instructor
    coursesStorage.insert(course.id, course);
    return Ok(course.id);
  }),

     // Update function to enroll in a course
     enrollCourse: update([text], Result(text, Message), (id) => {
        const currentUser = ic.caller();
        const courseOpt = coursesStorage.get(id);
        if ("None" in courseOpt) {
            return Err({ NotFound: `Course with ID ${id} not found` });
        }
        const course = courseOpt.Some;
        if (course.students.includes(currentUser.toText())) {
            return Err({ InvalidPayload: `User is already enrolled in course ${id}` });
        }
        course.students.push(currentUser);
        coursesStorage.insert(id, course);
        return Ok(`Enrolled in course ${id}`);
    }),
    

    // Update function to unenroll from a course
    unenrollCourse: update([text], Result(text, Message), (id) => {
        const courseOpt = coursesStorage.get(id);
        if ("None" in courseOpt) {
            return Err({ NotFound: `Course with ID ${id} not found` });
        }
        const course = courseOpt.Some;
        const index = course.students.findIndex(student => student === ic.caller());
        if (index === -1) {
            return Err({ InvalidPayload: `User is not enrolled in course ${id}` });
        }
        course.students.splice(index, 1);
        coursesStorage.insert(id, course);
        return Ok(`Unenrolled from course ${id}`);
    }),

    // Update function to purchase a course
    buyCourse: update([text], Result(text, Message), async (id) => {
        const courseOpt = coursesStorage.get(id);
        if ("None" in courseOpt) {
            return Err({ NotFound: `Course with ID ${id} not found` });
        }
        const course = courseOpt.Some;

        // Get the current user
        const currentUser = ic.caller();

        // Check if the user has already purchased the course
        const userOpt = usersStorage.get(currentUser.toText());
        if ("None" in userOpt) {
            return Err({ InvalidPayload: `User not found` });
        }
        const user = userOpt.Some;
        if (user.purchasedCourses.includes(id)) {
            return Err({ InvalidPayload: `User has already purchased the course ${id}` });
        }

        // Perform the payment transaction
        const paymentMemo = uuidv4(); // Generate a unique memo for the payment transaction
        const paymentAmount = course.price;
        const paymentTransaction = await makePaymentInternal(ic.caller(), course.instructor, paymentAmount, paymentMemo);
        if (paymentTransaction.status !== "Completed") {
            return Err({ PaymentFailed: `Payment for course ${id} failed` });
        }

        // Add the course to the user's purchased courses
        user.purchasedCourses.push(id);
        usersStorage.insert(currentUser.toText(), user);

        return Ok(`Course ${id} purchased successfully`);
    }),   
    
});

/*
    a hash function that is used to generate correlation ids for orders.
    also, we use that in the verifyPayment function where we check if the used has actually paid the order
*/
function hash(input: any): nat64 {
    return BigInt(Math.abs(hashCode().value(input)));
};

// Helper function to process payment transactions
export async function makePaymentInternal(from: Principal, to: Principal, amount: nat64, memo: string): Promise<Transaction> {
    const transferFeeResponse = await ic.call(icpCanister.transfer_fee, { args: [{}] });
    const transferResult = await ic.call(icpCanister.transfer, {
        args: [{
            memo: BigInt(Math.abs(hashCode().value(memo))),
            amount: {
                e8s: amount
            },
            fee: {
                e8s: transferFeeResponse.transfer_fee.e8s
            },
            from_subaccount: None,
            to: binaryAddressFromPrincipal(to,0),
            created_at_time: None
        }]
    });

    // Construct and return the transaction object
    const transaction: Transaction = {
        id: uuidv4(),
        from: from,
        to: to,
        amount: amount,
        memo: memo,
        status: transferResult.Ok ? "Completed" : "Failed"
    };

    // Store the transaction in the transactionsStorage
    transactionsStorage.insert(transaction.id, transaction);

    return transaction;
}

// a workaround to make uuid package work with Azle
globalThis.crypto = {
    // @ts-ignore
    getRandomValues: () => {
        let array = new Uint8Array(32);

        for (let i = 0; i < array.length; i++) {
            array[i] = Math.floor(Math.random() * 256);
        }

        return array;
    }
};

