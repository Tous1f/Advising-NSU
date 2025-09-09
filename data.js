// BatSched Course Dataset - Complete and Validated
// This file contains all course data and preferences for the scheduling system

function validateCourseData() {
  const requiredFields = ['course', 'section', 'faculty', 'time', 'days', 'seats'];
  const errors = [];

  COURSES.forEach((course, index) => {
    requiredFields.forEach(field => {
      if (!course[field]) {
        errors.push(`Course ${index}: Missing ${field}`);
      }
    });

    // Validate time format
    if (course.time && !/^\d{2}:\d{2} [AP]M - \d{2}:\d{2} [AP]M$/.test(course.time)) {
      errors.push(`Course ${index} (${course.course}): Invalid time format`);
    }

    // Validate days format
    if (course.days && !/^[SMTWRAF]+$/.test(course.days)) {
      errors.push(`Course ${index} (${course.course}): Invalid days format`);
    }
  });

  if (errors.length > 0) {
    console.warn('Course data validation errors:', errors);
  } else {
    console.log(`✅ Course data validated: ${COURSES.length} courses loaded successfully`);
  }

  return errors.length === 0;
}

// Complete course dataset
const COURSES = [
  // CSE327 Courses
  { course: "CSE327", section: 1, faculty: "NbM", time: "01:00 PM - 02:30 PM", days: "ST", seats: 35 },
  { course: "CSE327", section: 2, faculty: "NbM", time: "11:20 AM - 12:50 PM", days: "MW", seats: 35 },
  { course: "CSE327", section: 3, faculty: "AFE", time: "01:00 PM - 02:30 PM", days: "MW", seats: 35 },
  { course: "CSE327", section: 4, faculty: "AFE", time: "11:20 AM - 12:50 PM", days: "ST", seats: 35 },
  { course: "CSE327", section: 5, faculty: "ITN", time: "09:40 AM - 11:10 AM", days: "ST", seats: 35 },
  { course: "CSE327", section: 6, faculty: "IqN", time: "09:40 AM - 11:10 AM", days: "RA", seats: 35 },
  { course: "CSE327", section: 7, faculty: "MDSH", time: "09:40 AM - 11:10 AM", days: "RA", seats: 35 },
  { course: "CSE327", section: 8, faculty: "MMA1", time: "08:00 AM - 09:30 AM", days: "RA", seats: 35 },
  { course: "CSE327", section: 9, faculty: "MMA1", time: "11:20 AM - 12:50 PM", days: "RA", seats: 35 },
  { course: "CSE327", section: 10, faculty: "MRH1", time: "09:40 AM - 11:10 AM", days: "MW", seats: 35 },
  { course: "CSE327", section: 11, faculty: "TBA", time: "09:40 AM - 11:10 AM", days: "MW", seats: 35 },

  // EEE154 Courses
  { course: "EEE154", section: 1, faculty: "TBA", time: "11:20 AM - 12:50 PM", days: "S", seats: 0 },
  { course: "EEE154", section: 2, faculty: "TBA", time: "11:20 AM - 12:50 PM", days: "T", seats: 0 },
  { course: "EEE154", section: 3, faculty: "TBA", time: "02:40 PM - 04:10 PM", days: "M", seats: 0 },
  { course: "EEE154", section: 4, faculty: "TBA", time: "04:20 PM - 05:50 PM", days: "M", seats: 0 },
  { course: "EEE154", section: 5, faculty: "TBA", time: "01:00 PM - 02:30 PM", days: "R", seats: 0 },
  { course: "EEE154", section: 6, faculty: "TBA", time: "02:40 PM - 04:10 PM", days: "R", seats: 0 },
  { course: "EEE154", section: 7, faculty: "TBA", time: "04:20 PM - 05:50 PM", days: "R", seats: 0 },
  { course: "EEE154", section: 8, faculty: "TBA", time: "09:40 AM - 11:10 AM", days: "A", seats: 0 },
  { course: "EEE154", section: 9, faculty: "TBA", time: "11:20 AM - 12:50 PM", days: "A", seats: 0 },
  { course: "EEE154", section: 10, faculty: "TBA", time: "01:00 PM - 02:30 PM", days: "A", seats: 0 },
  { course: "EEE154", section: 11, faculty: "TBA", time: "08:00 AM - 09:30 AM", days: "A", seats: 0 },
  { course: "EEE154", section: 12, faculty: "TBA", time: "09:40 AM - 11:10 AM", days: "A", seats: 0 },
  { course: "EEE154", section: 13, faculty: "TBA", time: "11:20 AM - 12:50 PM", days: "A", seats: 0 },
  { course: "EEE154", section: 14, faculty: "TBA", time: "02:40 PM - 04:10 PM", days: "A", seats: 0 },
  { course: "EEE154", section: 15, faculty: "TBA", time: "04:20 PM - 05:50 PM", days: "A", seats: 0 },
  { course: "EEE154", section: 16, faculty: "TBA", time: "11:20 AM - 12:50 PM", days: "R", seats: 0 },
  { course: "EEE154", section: 17, faculty: "TBA", time: "01:00 PM - 02:30 PM", days: "R", seats: 0 },

  // CSE311 Courses
  { course: "CSE311", section: 1, faculty: "SLf", time: "08:00 AM - 09:30 AM", days: "ST", seats: 35 },
  { course: "CSE311", section: 2, faculty: "SLf", time: "09:40 AM - 11:10 AM", days: "ST", seats: 35 },
  { course: "CSE311", section: 3, faculty: "STI", time: "02:40 PM - 04:10 PM", days: "MW", seats: 35 },
  { course: "CSE311", section: 4, faculty: "NsA", time: "11:20 AM - 12:50 PM", days: "RA", seats: 35 },
  { course: "CSE311", section: 5, faculty: "NLH", time: "08:00 AM - 09:30 AM", days: "RA", seats: 35 },
  { course: "CSE311", section: 6, faculty: "TnS1", time: "02:40 PM - 04:10 PM", days: "RA", seats: 0 },
  { course: "CSE311", section: 7, faculty: "NLH", time: "09:40 AM - 11:10 AM", days: "RA", seats: 35 },
  { course: "CSE311", section: 8, faculty: "MKN1", time: "08:00 AM - 09:30 AM", days: "RA", seats: 35 },
  { course: "CSE311", section: 9, faculty: "RIS", time: "04:20 PM - 05:50 PM", days: "RA", seats: 35 },

  // CSE311L Courses
  { course: "CSE311L", section: 1, faculty: "TBA", time: "02:40 PM - 05:50 PM", days: "M", seats: 35 },
  { course: "CSE311L", section: 2, faculty: "TBA", time: "02:40 PM - 05:50 PM", days: "W", seats: 35 },
  { course: "CSE311L", section: 3, faculty: "TBA", time: "11:20 AM - 02:30 PM", days: "R", seats: 35 },
  { course: "CSE311L", section: 4, faculty: "TBA", time: "02:40 PM - 05:50 PM", days: "R", seats: 35 },
  { course: "CSE311L", section: 5, faculty: "TBA", time: "08:00 AM - 11:10 AM", days: "M", seats: 35 },
  { course: "CSE311L", section: 6, faculty: "TBA", time: "11:20 AM - 02:30 PM", days: "R", seats: 35 },
  { course: "CSE311L", section: 7, faculty: "TBA", time: "08:00 AM - 11:10 AM", days: "W", seats: 35 },
  { course: "CSE311L", section: 8, faculty: "TBA", time: "11:20 AM - 02:30 PM", days: "R", seats: 35 },
  { course: "CSE311L", section: 9, faculty: "TBA", time: "11:20 AM - 02:30 PM", days: "A", seats: 35 },
  { course: "CSE311L", section: 10, faculty: "TBA", time: "02:40 PM - 05:50 PM", days: "A", seats: 0 },

  // CHE101 Courses
  { course: "CHE101", section: 1, faculty: "FZD", time: "01:00 PM - 02:30 PM", days: "ST", seats: 40 },
  { course: "CHE101", section: 2, faculty: "SOH", time: "06:00 PM - 07:30 PM", days: "MW", seats: 40 },
  { course: "CHE101", section: 3, faculty: "SMD1", time: "01:00 PM - 02:30 PM", days: "ST", seats: 40 },
  { course: "CHE101", section: 4, faculty: "SMD1", time: "04:20 PM - 05:50 PM", days: "ST", seats: 40 },
  { course: "CHE101", section: 5, faculty: "MKR", time: "08:00 AM - 09:30 AM", days: "MW", seats: 40 },
  { course: "CHE101", section: 6, faculty: "PYN", time: "01:00 PM - 02:30 PM", days: "ST", seats: 40 },
  { course: "CHE101", section: 7, faculty: "FZD", time: "02:40 PM - 04:10 PM", days: "ST", seats: 40 },
  { course: "CHE101", section: 8, faculty: "HMS", time: "04:20 PM - 05:50 PM", days: "MW", seats: 40 },
  { course: "CHE101", section: 9, faculty: "SOH", time: "04:20 PM - 05:50 PM", days: "MW", seats: 40 },
  { course: "CHE101", section: 10, faculty: "MIO", time: "04:20 PM - 05:50 PM", days: "ST", seats: 40 },
  { course: "CHE101", section: 11, faculty: "SOH", time: "01:00 PM - 02:30 PM", days: "MW", seats: 40 },
  { course: "CHE101", section: 12, faculty: "MKR", time: "01:00 PM - 02:30 PM", days: "MW", seats: 40 },
  { course: "CHE101", section: 13, faculty: "HMS", time: "06:00 PM - 07:30 PM", days: "MW", seats: 40 },
  { course: "CHE101", section: 14, faculty: "MAR5", time: "06:00 PM - 07:30 PM", days: "RA", seats: 40 },
  { course: "CHE101", section: 15, faculty: "MAZM", time: "08:00 AM - 09:30 AM", days: "RA", seats: 40 },
  { course: "CHE101", section: 16, faculty: "ABI", time: "08:00 AM - 09:30 AM", days: "RA", seats: 40 },
  { course: "CHE101", section: 17, faculty: "BUN", time: "08:00 AM - 09:30 AM", days: "RA", seats: 40 },
  { course: "CHE101", section: 18, faculty: "AYS", time: "09:40 AM - 11:10 AM", days: "RA", seats: 40 },
  { course: "CHE101", section: 19, faculty: "MAZM", time: "09:40 AM - 11:10 AM", days: "RA", seats: 40 },
  { course: "CHE101", section: 20, faculty: "BUN", time: "09:40 AM - 11:10 AM", days: "RA", seats: 40 },
  { course: "CHE101", section: 21, faculty: "ABI", time: "11:20 AM - 12:50 PM", days: "RA", seats: 40 },
  { course: "CHE101", section: 22, faculty: "MABA", time: "11:20 AM - 12:50 PM", days: "RA", seats: 40 },
  { course: "CHE101", section: 23, faculty: "MTN2", time: "11:20 AM - 12:50 PM", days: "RA", seats: 40 },
  { course: "CHE101", section: 24, faculty: "LTB", time: "11:20 AM - 12:50 PM", days: "RA", seats: 40 },
  { course: "CHE101", section: 25, faculty: "MLZ", time: "08:00 AM - 09:30 AM", days: "RA", seats: 40 },
  { course: "CHE101", section: 26, faculty: "ABI", time: "01:00 PM - 02:30 PM", days: "RA", seats: 40 },
  { course: "CHE101", section: 27, faculty: "MTN2", time: "01:00 PM - 02:30 PM", days: "RA", seats: 40 },
  { course: "CHE101", section: 28, faculty: "SQU", time: "01:00 PM - 02:30 PM", days: "RA", seats: 40 },
  { course: "CHE101", section: 30, faculty: "SQU", time: "02:40 PM - 04:10 PM", days: "RA", seats: 40 },
  { course: "CHE101", section: 31, faculty: "LIZN", time: "09:40 AM - 11:10 AM", days: "ST", seats: 0 },
  { course: "CHE101", section: 32, faculty: "LIZN", time: "11:20 AM - 12:50 PM", days: "ST", seats: 0 },
  { course: "CHE101", section: 33, faculty: "LIZN", time: "08:00 AM - 09:30 AM", days: "MW", seats: 0 },
  { course: "CHE101", section: 34, faculty: "TBA", time: "08:00 AM - 09:30 AM", days: "RA", seats: 0 },
  { course: "CHE101", section: 35, faculty: "TBA", time: "04:20 PM - 05:50 PM", days: "RA", seats: 0 },
  { course: "CHE101", section: 36, faculty: "MASM", time: "11:20 AM - 12:50 PM", days: "RA", seats: 0 },
  { course: "CHE101", section: 37, faculty: "MABA", time: "02:40 PM - 04:10 PM", days: "RA", seats: 40 },
  { course: "CHE101", section: 38, faculty: "MTN2", time: "04:20 PM - 05:50 PM", days: "RA", seats: 40 },
  { course: "CHE101", section: 39, faculty: "SNHT", time: "04:20 PM - 05:50 PM", days: "RA", seats: 40 },
  { course: "CHE101", section: 40, faculty: "MABA", time: "04:20 PM - 05:50 PM", days: "RA", seats: 40 },
  { course: "CHE101", section: 41, faculty: "MMR3", time: "04:20 PM - 05:50 PM", days: "RA", seats: 40 },
  { course: "CHE101", section: 42, faculty: "LTB", time: "04:20 PM - 05:50 PM", days: "RA", seats: 40 },
  { course: "CHE101", section: 43, faculty: "MASM", time: "04:20 PM - 05:50 PM", days: "RA", seats: 40 },
  { course: "CHE101", section: 45, faculty: "MASM", time: "06:00 PM - 07:30 PM", days: "RA", seats: 40 },
  { course: "CHE101", section: 46, faculty: "SMD1", time: "06:00 PM - 07:30 PM", days: "ST", seats: 40 },
  { course: "CHE101", section: 47, faculty: "BUN", time: "01:00 PM - 02:30 PM", days: "RA", seats: 40 },
  { course: "CHE101", section: 48, faculty: "MMR3", time: "06:00 PM - 07:30 PM", days: "RA", seats: 40 },
  { course: "CHE101", section: 49, faculty: "SFRH", time: "04:20 PM - 05:50 PM", days: "MW", seats: 45 },
  { course: "CHE101", section: 50, faculty: "ABI", time: "08:00 AM - 09:30 AM", days: "RA", seats: 40 },
  { course: "CHE101", section: 51, faculty: "AYS", time: "11:20 AM - 12:50 PM", days: "RA", seats: 40 },

  // CSE173 Courses
  { course: "CSE173", section: 1, faculty: "SLE", time: "09:40 AM - 11:10 AM", days: "MW", seats: 35 },
  { course: "CSE173", section: 2, faculty: "MSK1", time: "11:20 AM - 12:50 PM", days: "ST", seats: 35 },
  { course: "CSE173", section: 3, faculty: "MSK1", time: "01:00 PM - 02:30 PM", days: "ST", seats: 35 },
  { course: "CSE173", section: 4, faculty: "MLE", time: "02:40 PM - 04:10 PM", days: "MW", seats: 35 },
  { course: "CSE173", section: 5, faculty: "MLE", time: "04:20 PM - 05:50 PM", days: "MW", seats: 35 },
  { course: "CSE173", section: 6, faculty: "SvA", time: "08:00 AM - 09:30 AM", days: "MW", seats: 35 },
  { course: "CSE173", section: 7, faculty: "ITN", time: "01:00 PM - 02:30 PM", days: "RA", seats: 35 },
  { course: "CSE173", section: 8, faculty: "ITN", time: "04:20 PM - 05:50 PM", days: "RA", seats: 35 },
  { course: "CSE173", section: 9, faculty: "AKR", time: "11:20 AM - 12:50 PM", days: "RA", seats: 35 },
  { course: "CSE173", section: 10, faculty: "SfT", time: "08:00 AM - 09:30 AM", days: "RA", seats: 35 },
  { course: "CSE173", section: 12, faculty: "RIS", time: "02:40 PM - 04:10 PM", days: "RA", seats: 35 },
  { course: "CSE173", section: 13, faculty: "SLE", time: "11:20 AM - 12:50 PM", days: "MW", seats: 35 },

  // ENG111 - English courses
  { course: "ENG111", section: 1, faculty: "KSS", time: "04:20 PM - 05:50 PM", days: "ST", seats: 35 },
  { course: "ENG111", section: 2, faculty: "LMh", time: "04:20 PM - 05:50 PM", days: "ST", seats: 40 },
  { course: "ENG111", section: 3, faculty: "FTN", time: "08:00 AM - 09:30 AM", days: "MW", seats: 35 },
  { course: "ENG111", section: 4, faculty: "NSj", time: "08:00 AM - 09:30 AM", days: "MW", seats: 40 },
  { course: "ENG111", section: 5, faculty: "MNK", time: "09:40 AM - 11:10 AM", days: "MW", seats: 35 },
  { course: "ENG111", section: 6, faculty: "NSj", time: "09:40 AM - 11:10 AM", days: "MW", seats: 40 },
  { course: "ENG111", section: 7, faculty: "MNK", time: "11:20 AM - 12:50 PM", days: "MW", seats: 35 },
  { course: "ENG111", section: 8, faculty: "NCA", time: "02:40 PM - 04:10 PM", days: "MW", seats: 35 },
  { course: "ENG111", section: 9, faculty: "NCA", time: "04:20 PM - 05:50 PM", days: "MW", seats: 35 },
  { course: "ENG111", section: 10, faculty: "KSS", time: "04:20 PM - 05:50 PM", days: "MW", seats: 35 },
  { course: "ENG111", section: 11, faculty: "TAA", time: "11:20 AM - 12:50 PM", days: "RA", seats: 40 },
  { course: "ENG111", section: 12, faculty: "TAA", time: "01:00 PM - 02:30 PM", days: "RA", seats: 40 },
  { course: "ENG111", section: 13, faculty: "SZn", time: "02:40 PM - 04:10 PM", days: "RA", seats: 40 },
  { course: "ENG111", section: 14, faculty: "SZn", time: "04:20 PM - 05:50 PM", days: "RA", seats: 40 },
  { course: "ENG111", section: 15, faculty: "FzM", time: "04:20 PM - 05:50 PM", days: "MW", seats: 40 },
  { course: "ENG111", section: 16, faculty: "FJN", time: "04:20 PM - 05:50 PM", days: "ST", seats: 35 },

  // CSE373 - Computer Science courses
  { course: "CSE373", section: 1, faculty: "SfM1", time: "11:20 AM - 12:50 PM", days: "ST", seats: 30 },
  { course: "CSE373", section: 2, faculty: "ARa2", time: "09:40 AM - 11:10 AM", days: "MW", seats: 35 },
  { course: "CSE373", section: 3, faculty: "STI", time: "01:00 PM - 02:30 PM", days: "MW", seats: 35 },
  { course: "CSE373", section: 4, faculty: "STI", time: "01:00 PM - 02:30 PM", days: "ST", seats: 35 },
  { course: "CSE373", section: 5, faculty: "IqN", time: "08:00 AM - 09:30 AM", days: "MW", seats: 35 },
  { course: "CSE373", section: 6, faculty: "IqN", time: "01:00 PM - 02:30 PM", days: "MW", seats: 35 },
  { course: "CSE373", section: 7, faculty: "QISD", time: "04:20 PM - 05:50 PM", days: "ST", seats: 35 },
  { course: "CSE373", section: 8, faculty: "SMAH", time: "08:00 AM - 09:30 AM", days: "RA", seats: 35 },
  { course: "CSE373", section: 9, faculty: "SMAH", time: "09:40 AM - 11:10 AM", days: "RA", seats: 35 },
  { course: "CSE373", section: 10, faculty: "EKD", time: "08:00 AM - 09:30 AM", days: "ST", seats: 35 },
  { course: "CSE373", section: 11, faculty: "EKD", time: "09:40 AM - 11:10 AM", days: "ST", seats: 35 },
  { course: "CSE373", section: 12, faculty: "ARa2", time: "02:40 PM - 04:10 PM", days: "MW", seats: 35 },
  { course: "CSE373", section: 13, faculty: "STL", time: "09:40 AM - 11:10 AM", days: "MW", seats: 35 },

  // EEE111 - Electrical Engineering courses
  { course: "EEE111", section: 1, faculty: "Aqu", time: "09:40 AM - 11:10 AM", days: "MW", seats: 35 },
  { course: "EEE111", section: 2, faculty: "RTK", time: "11:20 AM - 12:50 PM", days: "ST", seats: 35 },
  { course: "EEE111", section: 3, faculty: "MKL", time: "01:00 PM - 02:30 PM", days: "ST", seats: 35 },
  { course: "EEE111", section: 4, faculty: "JSA", time: "11:20 AM - 12:50 PM", days: "MW", seats: 35 },
  { course: "EEE111", section: 5, faculty: "JSA", time: "02:40 PM - 04:10 PM", days: "MW", seats: 35 },
  { course: "EEE111", section: 6, faculty: "SSH1", time: "01:00 PM - 02:30 PM", days: "ST", seats: 35 },
  { course: "EEE111", section: 7, faculty: "SSH1", time: "02:40 PM - 04:10 PM", days: "ST", seats: 35 },
  { course: "EEE111", section: 9, faculty: "SvS", time: "11:20 AM - 12:50 PM", days: "RA", seats: 35 },
  { course: "EEE111", section: 10, faculty: "MFY", time: "04:20 PM - 05:50 PM", days: "ST", seats: 35 },
  { course: "EEE111", section: 11, faculty: "KSE", time: "08:00 AM - 09:30 AM", days: "ST", seats: 35 },
  { course: "EEE111", section: 12, faculty: "SMU1", time: "08:00 AM - 09:30 AM", days: "RA", seats: 35 },
  { course: "EEE111", section: 13, faculty: "AKAZ", time: "11:20 AM - 12:50 PM", days: "RA", seats: 35 },
  { course: "EEE111", section: 14, faculty: "AKAZ", time: "01:00 PM - 02:30 PM", days: "RA", seats: 35 },
  { course: "EEE111", section: 15, faculty: "SMU1", time: "09:40 AM - 11:10 AM", days: "RA", seats: 35 },
  { course: "EEE111", section: 16, faculty: "HAI", time: "08:00 AM - 09:30 AM", days: "RA", seats: 35 },
  { course: "EEE111", section: 17, faculty: "NaNR", time: "11:20 AM - 12:50 PM", days: "MW", seats: 35 },

  // EEE111L - Electrical Engineering Lab courses
  { course: "EEE111L", section: 1, faculty: "Aqu", time: "02:40 PM - 05:50 PM", days: "T", seats: 35 },
  { course: "EEE111L", section: 2, faculty: "RTK", time: "02:40 PM - 05:50 PM", days: "S", seats: 35 },
  { course: "EEE111L", section: 3, faculty: "MKL", time: "08:00 AM - 11:10 AM", days: "R", seats: 35 },
  { course: "EEE111L", section: 4, faculty: "JSA", time: "08:00 AM - 11:10 AM", days: "M", seats: 35 },
  { course: "EEE111L", section: 5, faculty: "JSA", time: "08:00 AM - 11:10 AM", days: "W", seats: 35 },
  { course: "EEE111L", section: 6, faculty: "SSH1", time: "08:00 AM - 11:10 AM", days: "S", seats: 35 },
  { course: "EEE111L", section: 7, faculty: "SSH1", time: "08:00 AM - 11:10 AM", days: "T", seats: 35 },
  { course: "EEE111L", section: 9, faculty: "SvS", time: "11:20 AM - 02:30 PM", days: "W", seats: 35 },
  { course: "EEE111L", section: 10, faculty: "MFY", time: "11:20 AM - 02:30 PM", days: "S", seats: 35 },
  { course: "EEE111L", section: 11, faculty: "KSE", time: "11:20 AM - 02:30 PM", days: "T", seats: 35 },
  { course: "EEE111L", section: 12, faculty: "SMU1", time: "11:20 AM - 02:30 PM", days: "A", seats: 35 },
  { course: "EEE111L", section: 13, faculty: "AKAZ", time: "08:00 AM - 11:10 AM", days: "R", seats: 35 },
  { course: "EEE111L", section: 14, faculty: "AKAZ", time: "08:00 AM - 11:10 AM", days: "A", seats: 35 },
  { course: "EEE111L", section: 15, faculty: "SMU1", time: "02:40 PM - 05:50 PM", days: "A", seats: 30 },
  { course: "EEE111L", section: 16, faculty: "HAI", time: "11:20 AM - 02:30 PM", days: "A", seats: 30 },
  { course: "EEE111L", section: 17, faculty: "NaNR", time: "02:40 PM - 05:50 PM", days: "M", seats: 30 },

  // CSE273 - Advanced Programming courses
  { course: "CSE273", section: 1, faculty: "ARa2", time: "09:40 AM - 11:10 AM", days: "ST", seats: 35 },
  { course: "CSE273", section: 2, faculty: "ARa2", time: "11:20 AM - 12:50 PM", days: "ST", seats: 35 },
  { course: "CSE273", section: 3, faculty: "MKN1", time: "09:40 AM - 11:10 AM", days: "RA", seats: 35 },
  { course: "CSE273", section: 4, faculty: "MMK1", time: "08:00 AM - 09:30 AM", days: "ST", seats: 35 },
  { course: "CSE273", section: 5, faculty: "MMK1", time: "09:40 AM - 11:10 AM", days: "ST", seats: 35 },

  // CSE323 - Database Systems courses
  { course: "CSE323", section: 1, faculty: "NvA", time: "09:40 AM - 11:10 AM", days: "MW", seats: 35 },
  { course: "CSE323", section: 2, faculty: "NvA", time: "11:20 AM - 12:50 PM", days: "MW", seats: 35 },
  { course: "CSE323", section: 3, faculty: "RMz1", time: "08:00 AM - 09:30 AM", days: "RA", seats: 35 },
  { course: "CSE323", section: 4, faculty: "RMz1", time: "11:20 AM - 12:50 PM", days: "RA", seats: 35 },
  { course: "CSE323", section: 5, faculty: "MUA3", time: "08:00 AM - 09:30 AM", days: "RA", seats: 35 },
  { course: "CSE323", section: 6, faculty: "MUA3", time: "09:40 AM - 11:10 AM", days: "RA", seats: 35 }
];

// User preferences from file
const PREFERENCES = {
  'ENG111': ['NCA', 'FTN'],
  'CSE373': ['SfM1', 'SMAH', 'STI', 'EKD'],
  'EEE111': ['RTK', 'SvS', 'MFY'],
  'CSE273': ['MKN1', 'MMK1'],
  'CSE323': ['MUA3', 'RMz1']
};

// Required courses to schedule
const REQUIRED = ['ENG111', 'CSE373', 'EEE111', 'CSE273', 'CSE323'];

// Make COURSES available globally
window.COURSES = COURSES;

// Validate course data on startup
validateCourseData();
