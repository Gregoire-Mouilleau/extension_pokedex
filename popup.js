const pokeballBtn = document.getElementById('open-pokeball');
const pokemonResult = document.getElementById('pokemon-result');
const pokedexList = document.getElementById('pokedex-list');
const pokedexCount = document.getElementById('pokedex-count');

const lastOpenKey = 'lastOpenTimestamp';
const pokedexKey = 'myPokedex';

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

  pokemon.rarity = rarity;
  return pokemon;
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
        img: pokemon.sprites.front_default,
        rarity: pokemon.rarity
      });
      chrome.storage.local.set({ [pokedexKey]: pokedex }, displayPokedex);
    }
  });
}

function displayPokemon(pokemon) {
  pokemonResult.innerHTML = `
    <div class="pokemon-result-container ${pokemon.rarity}">
      <img src="${pokemon.sprites.front_default}">
    </div>
    <h4>${pokemon.name}</h4>
  `;
}

async function displayPokedex() {
  chrome.storage.local.get([pokedexKey], async (result) => {
    const pokedex = result[pokedexKey] || [];
    pokedexList.innerHTML = pokedex.map(p => `
      <li class="pokemon-container ${p.rarity}">
        <img src="${p.img}" alt="${p.name}" class="pokedex-img">
        <span class="pokemon-name">${p.name}</span>
      </li>`).join('');

    const res = await fetch('https://pokeapi.co/api/v2/pokemon-species/?limit=1');
    const data = await res.json();
    const totalPokemon = data.count;

    pokedexCount.textContent = `${pokedex.length} / ${totalPokemon} Pokémon capturés`;
  });
}

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

document.addEventListener('DOMContentLoaded', displayPokedex);
