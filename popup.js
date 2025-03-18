const pokeballBtn = document.getElementById('open-pokeball');
const pokemonResult = document.getElementById('pokemon-result');
const pokedexList = document.getElementById('pokedex-list');
const pokedexCount = document.getElementById('pokedex-count');
const languageToggle = document.getElementById('language-toggle');
const languageLabel = document.getElementById('language-label');

const lastOpenKey = 'lastOpenTimestamp';
const pokedexKey = 'myPokedex';

// 🟢 Fonction pour récupérer le nom dans la langue sélectionnée
async function getPokemonName(speciesData) {
  const selectedLanguage = localStorage.getItem('selectedLanguage') || 'fr';
  const nameEntry = speciesData.names.find(n => n.language.name === selectedLanguage);
  return nameEntry ? nameEntry.name : speciesData.name; // Fallback en anglais
}

async function fetchPokemonById(pokemonId) {
  const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${pokemonId}`);
  if (!res.ok) throw new Error('Erreur API Pokémon');
  const pokemon = await res.json();
  const speciesRes = await fetch(pokemon.species.url);
  const speciesData = await speciesRes.json();

  let rarity;
  if (speciesData.is_legendary || speciesData.is_mythical) {
    rarity = "legendary";
  } else if (speciesData.capture_rate <= 45) {
    rarity = "rare";
  } else {
    rarity = "common";
  }

  const pokemonName = await getPokemonName(speciesData);

  return {
    id: pokemon.id,
    name: pokemonName,
    img: pokemon.sprites.front_default,
    rarity: rarity
  };
}

async function getRandomPokemon() {
  const chance = Math.random();
  let desiredRarity;

  if (chance <= 0.01) desiredRarity = 'legendary';
  else if (chance <= 0.1) desiredRarity = 'rare';
  else desiredRarity = 'common';

  while (true) {
    const pokemonId = Math.floor(Math.random() * 1025) + 1;
    const pokemon = await fetchPokemonById(pokemonId);

    if (pokemon.rarity === desiredRarity) return pokemon;
  }
}

function savePokemon(pokemon) {
  chrome.storage.local.get([pokedexKey], (result) => {
    const pokedex = result[pokedexKey] || [];
    if (!pokedex.some(p => p.id === pokemon.id)) {
      pokedex.push({
        id: pokemon.id,
        name: pokemon.name,
        img: pokemon.img,
        rarity: pokemon.rarity,
        capturedAt: Date.now()
      });
      chrome.storage.local.set({ [pokedexKey]: pokedex }, displayPokedex);
    }
  });
}

function displayPokemon(pokemon) {
  pokemonResult.innerHTML = `
    <div class="pokemon-result-container ${pokemon.rarity}">
      <img src="${pokemon.img}">
    </div>
    <h4>${pokemon.name}</h4>
  `;
}

// 🟢 Fonction qui met à jour l'affichage des Pokémon capturés avec la langue sélectionnée
async function displayPokedex() {
  chrome.storage.local.get([pokedexKey], async (result) => {
    let pokedex = result[pokedexKey] || [];

    // Récupérer les noms des Pokémon en fonction de la langue choisie
    for (let i = 0; i < pokedex.length; i++) {
      const speciesRes = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${pokedex[i].id}/`);
      const speciesData = await speciesRes.json();
      pokedex[i].name = await getPokemonName(speciesData);
    }

    // Trier en fonction du filtre sélectionné
    const filter = document.getElementById('filter-pokedex').value;
    if (filter === 'number') {
      pokedex.sort((a, b) => a.id - b.id);
    } else if (filter === 'capture') {
      pokedex.sort((a, b) => a.capturedAt - b.capturedAt);
    }

    // Afficher les Pokémon capturés
    pokedexList.innerHTML = pokedex.map(p => `
      <li class="pokemon-container ${p.rarity}">
        <img src="${p.img}" alt="${p.name}" class="pokedex-img">
        <span class="pokemon-name">${p.name}</span>
      </li>`).join('');

    // Nombre total de Pokémon
    const res = await fetch('https://pokeapi.co/api/v2/pokemon-species/?limit=1');
    const data = await res.json();
    const totalPokemon = data.count;
    pokedexCount.textContent = `${pokedex.length} / ${totalPokemon} Pokémon capturés`;
  });
}

// 🟢 Gestion du changement de langue via le switch
function updateLanguageLabel() {
  const selectedLanguage = languageToggle.checked ? 'en' : 'fr';
  languageLabel.textContent = selectedLanguage === 'en' ? "English" : "Français";
  localStorage.setItem('selectedLanguage', selectedLanguage);
  displayPokedex();
}

// 🟢 Événements pour changer la langue et le tri
languageToggle.addEventListener('change', updateLanguageLabel);
document.getElementById('filter-pokedex').addEventListener('change', displayPokedex);

// 🟢 Capture d'un Pokémon
pokeballBtn.addEventListener('click', () => {
  chrome.storage.local.get([lastOpenKey], (result) => {
    const now = Date.now();
    const lastOpen = result[lastOpenKey] || 0;

    if (now - lastOpen >= 1000) { // cooldown 1 seconde pour tests rapides
      getRandomPokemon()
        .then(pokemon => {
          displayPokemon(pokemon);
          savePokemon(pokemon);
          chrome.storage.local.set({ [lastOpenKey]: now });
        })
        .catch(error => {
          pokemonResult.innerHTML = `<p>${error.message}</p>`;
        });
    } else {
      const remainingSeconds = Math.ceil((1000 - (now - lastOpen)) / 1000);
      pokemonResult.innerHTML = `<p>⏳ Attends ${remainingSeconds} secondes !</p>`;
    }
  });
});

// 🟢 Charger la langue sélectionnée au démarrage et mettre à jour le Pokédex
document.addEventListener('DOMContentLoaded', () => {
  const savedLanguage = localStorage.getItem('selectedLanguage') || 'fr';
  languageToggle.checked = savedLanguage === 'en';
  updateLanguageLabel();
  displayPokedex();
});
