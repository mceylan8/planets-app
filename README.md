# 🌌 Planets App

Welcome to the **Planets App** – a beautifully designed Expo app that showcases the planets of our solar system!  
Explore fascinating details about Mercury, Venus, Earth, and beyond, all wrapped in a sleek and interactive design.

---

## 🚀 Features

- 🪐 **Interactive 3D solar system** (Three.js via react-three-fiber): the Sun and all eight planets orbit with their real period ratios. Drag to rotate, pinch / scroll wheel / +− buttons to zoom.
- 🎯 **Tap a planet**: the camera flies over and follows it, and an info card shows the key facts.
- 🎨 **Procedural surfaces, no textures**: banded gas giants with Jupiter's Great Red Spot, Earth with oceans, clouds and polar caps, Saturn's rings with the Cassini division, Uranus tipped on its side, the Moon orbiting Earth.
- 📋 **Planet list and detail pages**, grouped into rocky planets, gas giants and ice giants, with NASA data.
- ⏯️ **Speed control**: pause, 1× (one Earth year in 40 s), 5×.
- 📱 **Cross-platform**: iOS, Android (via `expo-gl`) and web.

The design system (tokens, components, rules) is documented in [DESIGN.md](DESIGN.md).

---

## 🛠️ Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/mceylan8/planets-app.git
cd planets-app
```

### 2. Install dependencies

```bash
npm install
```

### 3. Start the development server

```bash
npx expo start
```

You'll see a QR code in the terminal. Open it with the [Expo Go](https://expo.dev/client) app on your smartphone or launch the app in a simulator/emulator.

---

## 🌟 How to Use

1. Open the app using one of the following methods:
   - **Expo Go**: Scan the QR code in the terminal.
   - **iOS Simulator**: Press `i` in the terminal.
   - **Android Emulator**: Press `a` in the terminal.

2. **System** tab: drag to rotate, zoom, tap a planet or pick one from the bar at the bottom.

3. **Planets** tab: browse all eight planets and open a detail page.

> After pulling these changes, rebuild the native app once (`npx expo run:ios` / `run:android`), because `expo-gl` is a new native module.

---

## 🧑‍💻 Development

This app uses Expo's **file-based routing** for clean navigation. Modify the files in the `app` directory to customize the app.

---

## 📚 Learn More

To learn more about Expo and how to build universal apps, check out these resources:

- [Expo Documentation](https://docs.expo.dev/)
- [Expo Router Guide](https://docs.expo.dev/router/introduction/)
- [React Native Docs](https://reactnative.dev/)

---

## 💌 Contributing

Feel free to fork this repository, submit a pull request, or open an issue for bugs and features. Contributions are always welcome! 🙌

---

## 👩‍🚀 Author

Created with ❤️ by [mceylan8](https://github.com/mceylan8).

---

## 🔗 License

This project is licensed under the [MIT License](LICENSE).

---

## 🚀 Future Enhancements

- Add animations to transitions between screens.
- Include real-time data about planets (e.g., distance from the Sun).
- Implement user interactions like favorites or notes.
