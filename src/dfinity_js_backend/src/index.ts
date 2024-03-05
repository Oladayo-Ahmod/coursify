import { query, update, text, Record, StableBTreeMap, Variant, Vec, None, Some, Ok, Err, ic, Principal, Opt, nat64, Duration, Result, bool, Canister } from "azle";
import { Ledger, binaryAddressFromAddress, binaryAddressFromPrincipal, hexAddressFromPrincipal } from "azle/canisters/ledger";
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
  price: nat64,
  students: Vec(Principal)
});

const User = Record({
  id: Principal,
  username: text,
  bio: text,
  skills: Vec(text),
  enrolledCourses: Vec(Principal),
  purchasedCourses: Vec(text)
});

type Transaction = {
  id: string,
  from: Principal,
  to: Principal,
  amount: nat64,
  memo: string,
  status: string
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
const transactionsStorage = StableBTreeMap(2, text, Record({
    id: text,
    from: Principal,
    to: Principal,
    amount: nat64,
    memo: text,
    status: text
}));

const icpCanister = Ledger(Principal.fromText("ryjl3-tyaaa-aaaaa-aaaba-cai"));

export default Canister({
    getCourses: query([], Vec(Course), () => {
        return coursesStorage.values();
    }),

    getCourse: query([text], Result(Course, Message), (id) => {
        const courseOpt = coursesStorage.get(id);
        if ("None" in courseOpt) {
            return Err({ NotFound: `Course with ID ${id} not found` });
        }
        return Ok(courseOpt.Some);
    }),

    getUserEnrolledCourses: query([], Result(Vec(Course), Message), () => {
        const currentUser = ic.caller();
        const enrolledCourses = coursesStorage.values().filter(course => course.students.some(student => student === currentUser));
        if (enrolledCourses.length === 0) {
            return Err({ NotFound: `No enrolled courses found for user ${currentUser}` });
        }
        const courseVec = enrolledCourses.map(course => {
            const { id, title, description, instructor, duration, skillLevel, prerequisites, price, students } = course;
            return { id, title, description, instructor, duration, skillLevel, prerequisites, price, students };
        });
        return Ok(courseVec);
    }),

    getUserCreatedCourses: query([], Result(Vec(Course), Message), () => {
        const currentUser = ic.caller();
        const createdCourses = coursesStorage.values().filter(course => course.instructor === currentUser);
        if (createdCourses.length === 0) {
            return Err({ NotFound: `No courses found for user ${currentUser}` });
        }
        const courseVec = createdCourses.map(course => {
            const { id, title, description, instructor, duration, skillLevel, prerequisites, price, students } = course;
            return { id, title, description, instructor, duration, skillLevel, prerequisites, price, students };
        });
        return Ok(courseVec);
    }),

    addCourse: update([Record({ title: text, description: text, duration: nat64, skillLevel: text, prerequisites: Vec(text), price: nat64 })], Result(text, Message), (payload) => {
        const currentUser = ic.caller();
        const course = { id: uuidv4(), instructor: currentUser, students: [currentUser], ...payload };
        coursesStorage.insert(course.id, course);
        return Ok(course.id);
    }),

    enrollCourse: update([text], Result(text, Message), (id) => {
        const currentUser = ic.caller();
        const courseOpt = coursesStorage.get(id);
        if ("None" in courseOpt) {
            return Err({ NotFound: `Course with ID ${id} not found` });
        }
        const course = courseOpt.Some;
        if (course.students.includes(currentUser)) {
            return Err({ InvalidPayload: `User is already enrolled in course ${id}` });
        }
        course.students.push(currentUser);
        coursesStorage.insert(id, course);
        return Ok(`Enrolled in course ${id}`);
    }),

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

    buyCourse: update([text], Result(text, Message), async (id) => {
        const currentUser = ic.caller();
        const userOpt = usersStorage.get(currentUser);
        if ("None" in userOpt) {
            return Err({ InvalidPayload: `User not found` });
        }
        const user = userOpt.Some;
        if (user.purchasedCourses.includes(id)) {
            return Err({ InvalidPayload: `User has already purchased the course ${id}` });
        }

        const courseOpt = coursesStorage.get(id);
        if ("None" in courseOpt) {
            return Err({ NotFound: `Course with ID ${id} not found` });
        }
        const course = courseOpt.Some;

        const paymentMemo = uuidv4();
        const paymentAmount = course.price;
        const paymentTransaction = await makePaymentInternal(ic.caller(), course.instructor, paymentAmount, paymentMemo);
        if (paymentTransaction.status !== "Completed") {
            return Err({ PaymentFailed: `Payment for course ${id} failed` });
        }

        user.purchasedCourses.push(id);
        usersStorage.insert(currentUser, user);

        return Ok(`Course ${id} purchased successfully`);
    }),
});

function hash(input: string): nat64 {
    return BigInt(Math.abs(hashCode().value(input)));
};

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

    const transaction: Transaction = {
        id: uuidv4(),
        from: from,
        to: to,
        amount: amount,
        memo: memo,
        status: transferResult.Ok ? "Completed" : "Failed"
    };

    transactionsStorage.insert(transaction.id, transaction);

    return transaction;
}

globalThis.crypto = {
    getRandomValues: () => {
        let array = new Uint8Array(32);
        for (let i = 0; i < array.length; i++) {
            array[i] = Math.floor(Math.random() * 256);
        }
        return array;
    }
};
