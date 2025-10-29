import React, { useState } from 'react';

const CareersPage: React.FC = () => {
  const [selectedDepartment, setSelectedDepartment] = useState('all');

  const jobs = [
    {
      id: 1,
      title: 'Senior EV Technician',
      department: 'technical',
      location: 'Ho Chi Minh City',
      type: 'Full-time',
      salary: 'Competitive',
      description: 'Join our expert team of EV technicians specializing in battery systems, electric motors, and charging infrastructure.',
      requirements: ['5+ years EV experience', 'ASE certifications', 'Electrical engineering degree']
    },
    {
      id: 2,
      title: 'Service Advisor',
      department: 'customer-service',
      location: 'Ho Chi Minh City',
      type: 'Full-time',
      salary: 'Competitive + Commission',
      description: 'Provide exceptional customer service and technical guidance for EV owners seeking maintenance and repairs.',
      requirements: ['2+ years automotive experience', 'Customer service skills', 'Basic EV knowledge']
    },
    {
      id: 3,
      title: 'Parts Manager',
      department: 'operations',
      location: 'Ho Chi Minh City',
      type: 'Full-time',
      salary: 'Competitive',
      description: 'Manage inventory of EV parts and accessories, ensuring optimal stock levels and supplier relationships.',
      requirements: ['3+ years parts management', 'Inventory software experience', 'Supply chain knowledge']
    },
    {
      id: 4,
      title: 'Software Developer',
      department: 'technology',
      location: 'Ho Chi Minh City',
      type: 'Full-time',
      salary: 'Competitive',
      description: 'Develop and maintain our EV service management platform, focusing on user experience and system reliability.',
      requirements: ['React/TypeScript experience', 'Node.js backend', 'MongoDB knowledge']
    },
    {
      id: 5,
      title: 'Marketing Specialist',
      department: 'marketing',
      location: 'Ho Chi Minh City',
      type: 'Full-time',
      salary: 'Competitive',
      description: 'Promote our EV services and build brand awareness in the growing electric vehicle market.',
      requirements: ['Digital marketing experience', 'Social media expertise', 'Content creation skills']
    },
    {
      id: 6,
      title: 'Quality Assurance Inspector',
      department: 'technical',
      location: 'Ho Chi Minh City',
      type: 'Full-time',
      salary: 'Competitive',
      description: 'Ensure all EV services meet our high quality standards and regulatory requirements.',
      requirements: ['Quality control experience', 'Technical background', 'Attention to detail']
    }
  ];

  const departments = [
    { id: 'all', name: 'All Departments', count: jobs.length },
    { id: 'technical', name: 'Technical', count: jobs.filter(j => j.department === 'technical').length },
    { id: 'customer-service', name: 'Customer Service', count: jobs.filter(j => j.department === 'customer-service').length },
    { id: 'operations', name: 'Operations', count: jobs.filter(j => j.department === 'operations').length },
    { id: 'technology', name: 'Technology', count: jobs.filter(j => j.department === 'technology').length },
    { id: 'marketing', name: 'Marketing', count: jobs.filter(j => j.department === 'marketing').length }
  ];

  const filteredJobs = selectedDepartment === 'all'
    ? jobs
    : jobs.filter(job => job.department === selectedDepartment);

  return (
    <div className="min-h-screen bg-dark-900">
      <div className="max-w-7xl mx-auto py-16 px-4 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-white mb-4">Join Our Team</h1>
          <p className="text-xl text-text-secondary max-w-3xl mx-auto">
            Be part of the future of electric vehicle service. We're looking for passionate
            professionals to help shape the EV industry and deliver exceptional service experiences.
          </p>
        </div>

        {/* Why Join Us */}
        <div className="bg-dark-300 rounded-lg shadow-lg p-8 mb-12">
          <h2 className="text-2xl font-bold text-white mb-8 text-center">Why Choose EV Service Center?</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-lime-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-lime-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Innovation</h3>
              <p className="text-text-secondary">Work with cutting-edge EV technology and modern service equipment</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-lime-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-dark-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Growth</h3>
              <p className="text-text-secondary">Continuous learning opportunities and career advancement paths</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Impact</h3>
              <p className="text-text-secondary">Contribute to sustainable transportation and environmental protection</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Team</h3>
              <p className="text-text-secondary">Collaborate with passionate professionals in a supportive environment</p>
            </div>
          </div>
        </div>

        {/* Department Filter */}
        <div className="bg-dark-300 rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-xl font-bold text-white mb-4">Filter by Department</h2>
          <div className="flex flex-wrap gap-3">
            {departments.map(dept => (
              <button
                key={dept.id}
                onClick={() => setSelectedDepartment(dept.id)}
                className={`px-4 py-2 rounded-lg text-text-muted transition-colors duration-200 ${
                  selectedDepartment === dept.id
                    ? 'bg-lime-600 text-white'
                    : 'bg-dark-100 text-text-secondary hover:bg-dark-200'
                }`}
              >
                {dept.name} ({dept.count})
              </button>
            ))}
          </div>
        </div>

        {/* Job Listings */}
        <div className="space-y-6 mb-12">
          {filteredJobs.length === 0 ? (
            <div className="bg-dark-300 rounded-lg shadow-lg p-8 text-center">
              <svg className="w-16 h-16 text-text-muted mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m8 0V8a2 2 0 01-2 2H8a2 2 0 01-2-2V6m8 0H8m0 0V4" />
              </svg>
              <h3 className="text-lg text-text-muted text-white mb-2">No positions available</h3>
              <p className="text-text-secondary">Check back later for new opportunities in this department.</p>
            </div>
          ) : (
            filteredJobs.map(job => (
              <div key={job.id} className="bg-dark-300 rounded-lg shadow-lg p-6">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-white mb-1">{job.title}</h3>
                    <div className="flex flex-wrap gap-4 text-sm text-text-secondary">
                      <span className="flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {job.location}
                      </span>
                      <span className="flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {job.type}
                      </span>
                      <span className="flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                        </svg>
                        {job.salary}
                      </span>
                    </div>
                  </div>
                  <button className="mt-4 lg:mt-0 bg-lime-600 hover:bg-lime-100 transition-all duration-200 transform hover:scale-105 text-white hover:text-dark-900 px-6 py-2 rounded-lg text-text-muted transition-colors duration-200">
                    Apply Now
                  </button>
                </div>

                <p className="text-text-secondary mb-4">{job.description}</p>

                <div>
                  <h4 className="font-semibold text-white mb-2">Requirements:</h4>
                  <ul className="list-disc list-inside text-text-secondary space-y-1">
                    {job.requirements.map((req, index) => (
                      <li key={index}>{req}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Application Process */}
        <div className="bg-dark-900 rounded-lg p-8 text-white">
          <h2 className="text-2xl font-bold mb-6 text-center">How to Apply</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-dark-300 bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold">1</span>
              </div>
              <h3 className="text-lg font-semibold mb-2">Submit Application</h3>
              <p className="text-lime-100">Send your resume and cover letter to careers@evservicecenter.com</p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-dark-300 bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold">2</span>
              </div>
              <h3 className="text-lg font-semibold mb-2">Interview Process</h3>
              <p className="text-lime-100">Technical and behavioral interviews with our hiring team</p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-dark-300 bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold">3</span>
              </div>
              <h3 className="text-lg font-semibold mb-2">Join the Team</h3>
              <p className="text-lime-100">Start your career in the exciting world of EV technology</p>
            </div>
          </div>

          <div className="text-center mt-8">
            <p className="text-lg text-lime-100 mb-4">
              Ready to join our team? We look forward to hearing from you!
            </p>
            <a
              href="mailto:careers@evservicecenter.com"
              className="bg-dark-300 text-lime-600 px-8 py-3 rounded-lg text-text-muted hover:bg-dark-900 transition-colors duration-200"
            >
              careers@evservicecenter.com
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CareersPage;
