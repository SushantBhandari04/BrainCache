import { Link } from 'react-router-dom';
import { Footer } from '../components/footer';

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      {/* Navigation */}
      <nav className="fixed inset-x-0 top-0 bg-white/95 backdrop-blur-sm shadow-sm z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              BrainCache
            </h1>
            <div className="flex items-center gap-3 sm:gap-6 text-xs sm:text-sm">
              <a href="#features" className="hidden sm:inline-block text-gray-700 hover:text-indigo-600 font-medium transition-colors">
                Features
              </a>
              <a href="#how-it-works" className="hidden sm:inline-block text-gray-700 hover:text-indigo-600 font-medium transition-colors">
                How It Works
              </a>
              <Link 
                to="/user/signin" 
                className="text-indigo-600 hover:text-indigo-700 font-medium transition-colors px-3 sm:px-4 py-2"
              >
                Sign In
              </Link>
              <Link 
                to="/user/signup" 
                className="bg-indigo-600 text-white px-3 sm:px-4 py-2 rounded-md font-medium hover:bg-indigo-700 transition-colors"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="pt-24 pb-16 md:pt-28 md:pb-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-indigo-50 to-indigo-100">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-10 md:gap-12">
          <div className="md:w-1/2 mb-8 md:mb-0 md:pr-8">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight mb-4 sm:mb-6">
              Organize. Share. Remember.
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-gray-600 mb-6 sm:mb-8 max-w-xl">
              BrainCache is your personal knowledge hub for saving and organizing web content, documents, and media in one place.
            </p>
            <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4">
              <Link 
                to="/user/signup" 
                className="bg-indigo-600 text-white px-6 py-3 rounded-md font-medium hover:bg-indigo-700 transition-colors text-center shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                Start for Free
              </Link>
              <a 
                href="#how-it-works" 
                className="bg-white text-indigo-600 border border-indigo-600 px-6 py-3 rounded-md font-medium hover:bg-gray-50 transition-colors text-center"
              >
                Learn More
              </a>
            </div>
          </div>
          <div className="md:w-1/2 flex justify-center">
            <div className="relative w-full max-w-md sm:max-w-lg">
              <div className="bg-white p-2 rounded-xl shadow-2xl border border-gray-100">
                <div className="bg-gray-800 p-2 rounded-t-lg flex space-x-2">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                </div>
                <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-6 rounded-b-lg">
                  <div className="grid grid-cols-2 gap-4">
                    {['Web Links', 'Documents', 'Videos', 'Notes'].map((item) => (
                      <div key={item} className="bg-white/10 backdrop-blur-sm p-4 rounded-lg text-white">
                        <div className="font-medium">{item}</div>
                        <div className="text-sm opacity-80">Save {item.toLowerCase()} with one click</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="absolute -z-10 w-full h-full bg-indigo-200 rounded-2xl -bottom-2 -right-2"></div>
            </div>
          </div>
        </div>
      </header>

      {/* Features Section */}
      <section id="features" className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-10 sm:mb-16 text-gray-900">
            Powerful Features
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            {[
              {
                icon: '🌐',
                title: 'Save Anything',
                description: 'Save links, documents, videos, and more with a single click.'
              },
              {
                icon: '📂',
                title: 'Organize Easily',
                description: 'Create custom spaces and collections to keep everything in order.'
              },
              {
                icon: '🔗',
                title: 'Share Securely',
                description: 'Share your collections or individual items with anyone, or keep them private.'
              }
            ].map((feature, index) => (
              <div 
                key={index}
                className="bg-white p-5 sm:p-6 rounded-xl shadow-md border border-gray-100 hover:shadow-lg transition-shadow duration-300"
              >
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold mb-2 text-gray-900">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-10 sm:mb-16 text-gray-900">
            How It Works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            {[
              {
                number: '1',
                title: 'Save Content',
                description: 'Use our browser extension or web interface to save content with one click.'
              },
              {
                number: '2',
                title: 'Organize',
                description: 'Create spaces and add tags to keep your content organized and searchable.'
              },
              {
                number: '3',
                title: 'Share',
                description: 'Share your collections with others or keep them just for yourself.'
              }
            ].map((step, index) => (
              <div key={index} className="text-center">
                <div className="w-16 h-16 mx-auto rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-2xl font-bold mb-4">
                  {step.number}
                </div>
                <h3 className="text-xl font-semibold mb-2 text-gray-900">{step.title}</h3>
                <p className="text-gray-600 max-w-xs mx-auto">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-14 sm:py-16 px-4 sm:px-6 lg:px-8 bg-indigo-600 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-4">Ready to organize your digital life?</h2>
          <p className="text-base sm:text-lg md:text-xl text-indigo-100 mb-6 sm:mb-8 max-w-2xl mx-auto">
            Join thousands of users who are already using BrainCache to save and share knowledge.
          </p>
          <Link 
            to="/user/signup" 
            className="inline-block bg-white text-indigo-600 px-8 py-3 rounded-md font-semibold hover:bg-gray-100 transition-colors shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            Get Started for Free
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default LandingPage;
