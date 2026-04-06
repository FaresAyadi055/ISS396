package com.example.smartcropdiseasereporter.ui.login

import android.content.Context
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import com.example.smartcropdiseasereporter.data.LoginDataSource
import com.example.smartcropdiseasereporter.data.LoginRepository
import com.example.smartcropdiseasereporter.util.SettingsManager

/**
 * ViewModel provider factory to instantiate LoginViewModel.
 * Required given LoginViewModel has a non-empty constructor
 */
class LoginViewModelFactory(private val context: Context) : ViewModelProvider.Factory {

    @Suppress("UNCHECKED_CAST")
    override fun <T : ViewModel> create(modelClass: Class<T>): T {
        if (modelClass.isAssignableFrom(LoginViewModel::class.java)) {
            val settingsManager = SettingsManager(context)
            return LoginViewModel(
                loginRepository = LoginRepository(
                    dataSource = LoginDataSource(settingsManager)
                )
            ) as T
        }
        throw IllegalArgumentException("Unknown ViewModel class")
    }
}
