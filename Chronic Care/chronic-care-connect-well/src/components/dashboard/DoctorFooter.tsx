import React from 'react';

export default function DoctorFooter() {
	return (
		<footer className="bg-gray-800 border-t border-gray-700 p-4 text-center text-sm text-gray-400">
			© {new Date().getFullYear()} ChronicCare — Doctor area
		</footer>
	);
}
