// Team structure data - used for auto-assigning designations and team page display
export const TEAM_STRUCTURE = {
  executive_officers: [
    { position: "Chair", name: "Kunal Kumar", email: "23cs3035@rgipt.ac.in" },
    { position: "Vice Chair", name: "Jay Kumar Sinha", email: "23ec3022@rgipt.ac.in" },
    { position: "Secretary", name: "Anandsagar Sanjay Gaikwad", email: "23cs3008@rgipt.ac.in" },
    { position: "Secretary", name: "Chhavi Bhatt", email: "23cs2019@rgipt.ac.in" },
    { position: "Treasurer", name: "Karan Pratap Singh", email: "23ec3056@rgipt.ac.in" },
    { position: "Web Master", name: "Aditya Bhattacharya", email: "23cd3002@rgipt.ac.in" },
    { position: "Web Master", name: "Vaibhav", email: "23ev3030@rgipt.ac.in" }
  ],
  teams: {
    CS: {
      officers: [
        { position: "CS Secretary", name: "Aditya Bhattacharya", email: "23cd3002@rgipt.ac.in" },
        { position: "CS Vice Secretary", name: "Vaibhav", email: "23ev3030@rgipt.ac.in" }
      ],
      heads_and_coheads: {
        head: { name: "Ishita", email: "24cs2019@rgipt.ac.in" },
        co_heads: [
          { name: "Aadya", email: "24cs3002@rgipt.ac.in" },
          { name: "Shashank", email: "24it3056@rgipt.ac.in" },
          { name: "Vedant", email: "24cs3063@rgipt.ac.in" },
          { name: "Saurabh", email: "24cs3044@rgipt.ac.in" }
        ]
      }
    },
    COMSOC: {
      officers: [
        { position: "COMSOC Secretary", name: "Shivam Chaturvedi", email: "23ev3025@rgipt.ac.in" },
        { position: "COMSOC Vice Secretary", name: "Prabhat Kushwaha", email: "23ev3019@rgipt.ac.in" },
        { position: "COMSOC Vice Secretary", name: "Mouli", email: "23ec3029@rgipt.ac.in" }
      ],
      heads_and_coheads: {
        head: { name: "Akash", email: "24ev3003@rgipt.ac.in" },
        co_heads: [
          { name: "Shubham", email: "24ec3034@rgipt.ac.in" },
          { name: "Krishna", email: "24cd3021@rgipt.ac.in" },
          { name: "Naman Patel", email: "24cd3028@rgipt.ac.in" }
        ]
      }
    },
    WIE: {
      officers: [
        { position: "WIE Secretary", name: "Gauri Maurya", email: "23ec3020@rgipt.ac.in" },
        { position: "WIE Vice Secretary", name: "Maanvi Mishra", email: "23ec3026@rgipt.ac.in" },
        { position: "WIE Vice Secretary", name: "Anshita Singh", email: "23cs2010@rgipt.ac.in" }
      ],
      heads_and_coheads: {
        head: { name: "Vedanshi", email: "24ec3044@rgipt.ac.in" },
        co_heads: [
          { name: "Tanisha", email: "24cs3057@rgipt.ac.in" },
          { name: "Sonali", email: "24cs3052@rgipt.ac.in" }
        ]
      }
    },
    RAS: {
      officers: [
        { position: "RAS Secretary", name: "Akhileshwar Pratap Singh", email: "23ec3008@rgipt.ac.in" },
        { position: "RAS Vice Secretary", name: "Raushan Kumar", email: "23ec3038@rgipt.ac.in" },
        { position: "RAS Vice Secretary", name: "Rishabh Tomar", email: "23ec3039@rgipt.ac.in" }
      ],
      heads_and_coheads: {
        head: { name: "Prajwal", email: "24ec3020@rgipt.ac.in" },
        co_heads: [
          { name: "Arindol", email: "24cd3007@rgipt.ac.in" },
          { name: "Suryansh", email: "24cs3055@rgipt.ac.in" },
          { name: "Aman Shresht", email: "24it3055@rgipt.ac.in" }
        ]
      }
    },
    Joint_Secretary: {
      heads_and_coheads: {
        head: { name: "Prateek", email: "24ev3025@rgipt.ac.in" },
        co_heads: [
          { name: "Praranjay", email: "24it3058@rgipt.ac.in" },
          { name: "Anagh", email: "24ev3004@rgipt.ac.in" },
          { name: "Aadrika", email: "24cd3001@rgipt.ac.in" }
        ]
      }
    },
    Design: {
      heads_and_coheads: {
        head: { name: "Shreya", email: "24ev3023@rgipt.ac.in" },
        co_heads: [
          { name: "Harshita", email: "24cd3016@rgipt.ac.in" },
          { name: "Prashant", email: "24mc3035@rgipt.ac.in" },
          { name: "Ashutosh", email: "24ev3026@rgipt.ac.in" }
        ]
      }
    },
    Audit: {
      heads_and_coheads: {
        head: { name: "Ujjwal", email: "24cs2039@rgipt.ac.in" },
        co_heads: [
          { name: "Rishabh", email: "24ec3026@rgipt.ac.in" },
          { name: "Maitri", email: "24ec3016@rgipt.ac.in" },
          { name: "Anurag", email: "24mc3008@rgipt.ac.in" }
        ]
      }
    },
    Editorial: {
      heads_and_coheads: {
        head: { name: "Keshav", email: "24cs3029@rgipt.ac.in" },
        co_heads: [
          { name: "Amishi", email: "24mc3004@rgipt.ac.in" },
          { name: "Yuvraj", email: "24cs2041@rgipt.ac.in" }
        ]
      }
    },
    EVENT: {
      heads_and_coheads: {
        head: { name: "Aavya", email: "24ec3002@rgipt.ac.in" },
        co_heads: [
          { name: "Shanvi", email: "24cd3037@rgipt.ac.in" },
          { name: "Sashi", email: "24ev3030@rgipt.ac.in" },
          { name: "Gaurav", email: "24ec3013@rgipt.ac.in" },
          { name: "Satyam", email: "24cs2032@rgipt.ac.in" }
        ]
      }
    },
    CNM: {
      heads_and_coheads: {
        head: { name: "Tanya", email: "24cd3046@rgipt.ac.in" },
        co_heads: [
          { name: "Rishita", email: "24cd3034@rgipt.ac.in" },
          { name: "Shubhayu", email: "24mc3046@rgipt.ac.in" },
          { name: "Arnav", email: "24ec3010@rgipt.ac.in" },
          { name: "Anish", email: "24mc3006@rgipt.ac.in" }
        ]
      }
    }
  }
};

// Generate email to designation mapping for easy lookup
export const getEmailToDesignationMap = () => {
  const emailMap = {};
  
  // Add executive officers - these get their position as designation
  TEAM_STRUCTURE.executive_officers.forEach(officer => {
    emailMap[officer.email.toLowerCase()] = officer.position;
  });
  
  // Add team officers and heads/coheads
  Object.keys(TEAM_STRUCTURE.teams).forEach(teamKey => {
    const team = TEAM_STRUCTURE.teams[teamKey];
    
    // Add officers - these get their position as designation
    if (team.officers) {
      team.officers.forEach(officer => {
        emailMap[officer.email.toLowerCase()] = officer.position;
      });
    }
    
    // Add heads
    if (team.heads_and_coheads?.head) {
      const headEmail = team.heads_and_coheads.head.email.toLowerCase();
      if (teamKey === 'CS') {
        emailMap[headEmail] = 'CS_Head';
      } else if (teamKey === 'Joint_Secretary') {
        emailMap[headEmail] = 'Joint_Sec';
      } else {
        emailMap[headEmail] = `${teamKey}_Head`;
      }
    }
    
    // Add coheads
    if (team.heads_and_coheads?.co_heads) {
      team.heads_and_coheads.co_heads.forEach(cohead => {
        const coheadEmail = cohead.email.toLowerCase();
        if (teamKey === 'Joint_Secretary') {
          emailMap[coheadEmail] = 'Joint_Sec';
        } else {
          emailMap[coheadEmail] = teamKey; // Coheads get team name as designation
        }
      });
    }
  });
  
  return emailMap;
};

