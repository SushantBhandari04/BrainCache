export function Footer() {
    return <footer className="bg-gray-900 text-gray-300 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                <div className="mb-8 md:mb-0">
                    <h2 className="text-2xl font-bold text-white mb-2">BrainCache</h2>
                    <p className="text-indigo-300">Your personal knowledge hub</p>
                </div>
                <div>
                    <h4 className="text-white font-semibold mb-4">Product</h4>
                    <ul className="space-y-2">
                        <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                        <li><a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a></li>
                        <li><a href="#pricing" className="hover:text-white transition-colors">Pricing</a></li>
                    </ul>
                </div>
                <div>
                    <h4 className="text-white font-semibold mb-4">Company</h4>
                    <ul className="space-y-2">
                        <li><a href="#about" className="hover:text-white transition-colors">About Us</a></li>
                        <li><a href="#blog" className="hover:text-white transition-colors">Blog</a></li>
                        <li><a href="#careers" className="hover:text-white transition-colors">Careers</a></li>
                    </ul>
                </div>
                <div>
                    <h4 className="text-white font-semibold mb-4">Support</h4>
                    <ul className="space-y-2">
                        <li><a href="#help" className="hover:text-white transition-colors">Help Center</a></li>
                        <li><a href="#contact" className="hover:text-white transition-colors">Contact Us</a></li>
                        <li><a href="#privacy" className="hover:text-white transition-colors">Privacy Policy</a></li>
                    </ul>
                </div>
            </div>
            <div className="border-t border-gray-800 mt-12 pt-8 text-center text-gray-500">
                <p>© {new Date().getFullYear()} BrainCache. All rights reserved.</p>
            </div>
        </div>
    </footer>
}